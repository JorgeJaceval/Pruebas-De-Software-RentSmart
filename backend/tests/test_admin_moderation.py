"""HU-18: retiro y restitución de publicaciones por administración (CA-01 a CA-07)."""
from uuid import UUID, uuid4

import pytest
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlmodel import Session, select

from app.models import Payment, Reservation, Space, SpaceModeration
from test_payment_simulation import pay
from test_reservation_cancellation import cancel
from test_reservations import booking_setup, clock, reserve  # noqa: F401 (fixtures)
from test_space_detail import make_admin
from test_space_status import status_change, withdraw_space
from test_space_updates import create_space, read_space, update_data
from test_spaces import authenticate, publication

pytestmark = pytest.mark.postgres

ADMIN_FIELDS = {
    "id", "name", "commune", "owner_id", "owner_name", "owner_email", "is_active",
    "is_withdrawn", "withdrawal_reason", "withdrawn_at", "withdrawn_by_name",
}
REASON = "Fotos que no corresponden al espacio publicado."


def withdraw(client, space_id, headers, payload=None):
    return client.post(f"/api/admin/spaces/{space_id}/withdrawal", headers=headers,
                       json={"reason": REASON} if payload is None else payload)


def restore(client, space_id, headers):
    return client.delete(f"/api/admin/spaces/{space_id}/withdrawal", headers=headers)


def stored(engine, space_id):
    with Session(engine) as session:
        return session.get(Space, UUID(space_id)).model_dump()


def moderations(engine, space_id=None):
    with Session(engine) as session:
        query = select(SpaceModeration).order_by(SpaceModeration.created_at)
        if space_id:
            query = query.where(SpaceModeration.space_id == UUID(space_id))
        return [row.model_dump() for row in session.exec(query).all()]


def test_cp01_admin_lista_activos_inactivos_y_retirados_con_propietario(postgres_client, postgres_engine):
    owner, owner_headers, active = create_space(postgres_client)
    inactive = postgres_client.post("/api/spaces", headers=owner_headers,
                                     json=publication(name="Estudio inactivo")).json()
    assert status_change(postgres_client, inactive, owner_headers, False).status_code == 200
    legacy = postgres_client.post("/api/spaces", headers=owner_headers,
                                  json=publication(name="Bodega retirada antes")).json()
    withdraw_space(postgres_engine, legacy)
    admin_headers = make_admin(postgres_client, postgres_engine)
    response = postgres_client.get("/api/admin/spaces", headers=admin_headers)
    assert response.status_code == 200 and response.headers["Cache-Control"] == "no-store"
    body = {item["id"]: item for item in response.json()}
    assert set(body) == {active["id"], inactive["id"], legacy["id"]}
    for item in body.values():
        assert set(item) == ADMIN_FIELDS  # no prices, payments or credentials (CA-07)
        assert item["owner_id"] == owner["id"] and item["owner_email"] == owner["email"]
        assert item["owner_name"] == owner["name"]
    assert (body[active["id"]]["is_active"], body[active["id"]]["is_withdrawn"]) == (True, False)
    assert (body[inactive["id"]]["is_active"], body[inactive["id"]]["is_withdrawn"]) == (False, False)
    # A withdrawal from before HU-18 has no recorded reason, author or date; we don't invent one.
    legacy_item = body[legacy["id"]]
    assert legacy_item["is_withdrawn"] is True and legacy_item["is_active"] is False
    assert (legacy_item["withdrawal_reason"], legacy_item["withdrawn_at"], legacy_item["withdrawn_by_name"]) == (
        None, None, None)
    assert [item["name"] for item in response.json()] == sorted(item["name"] for item in response.json())


def test_cp02_usuario_comun_y_sin_sesion_no_acceden_ni_por_endpoint(postgres_client, postgres_engine):
    _, owner_headers, space = create_space(postgres_client)
    _, other_headers = authenticate(postgres_client, "comun@example.com")
    before = stored(postgres_engine, space["id"])
    for headers, expected in (({}, 401), ({"Authorization": "Bearer invalido"}, 401),
                              (other_headers, 403), (owner_headers, 403)):
        listed = postgres_client.get("/api/admin/spaces", headers=headers)
        assert listed.status_code == expected and listed.headers["Cache-Control"] == "no-store"
        assert withdraw(postgres_client, space["id"], headers).status_code == expected
        assert restore(postgres_client, space["id"], headers).status_code == expected
    assert stored(postgres_engine, space["id"]) == before
    assert moderations(postgres_engine) == []


def test_cp03_retiro_exige_motivo_y_registra_autor_fecha(postgres_client, postgres_engine, clock):
    _, _, space = create_space(postgres_client)
    admin_headers = make_admin(postgres_client, postgres_engine)
    before = stored(postgres_engine, space["id"])
    invalid = ({}, {"reason": ""}, {"reason": "   "}, {"reason": "x" * 201}, {"reason": 5},
               {"reason": REASON, "is_active": True})
    for payload in invalid:
        response = withdraw(postgres_client, space["id"], admin_headers, payload)
        assert response.status_code == 422, payload
        assert set(response.json()["errors"]) <= {"reason", "form"} and response.json()["errors"]
    assert withdraw(postgres_client, uuid4(), admin_headers).status_code == 404
    assert withdraw(postgres_client, "no-es-uuid", admin_headers).status_code == 422
    assert stored(postgres_engine, space["id"]) == before and moderations(postgres_engine) == []

    response = withdraw(postgres_client, space["id"], admin_headers, {"reason": f"  {'m' * 200}  "})
    assert response.status_code == 200 and response.headers["Cache-Control"] == "no-store"
    body = response.json()
    assert body["withdrawal_reason"] == "m" * 200
    assert body["is_withdrawn"] is True and body["is_active"] is False
    assert body["withdrawn_by_name"] == "Persona de Prueba" and body["withdrawn_at"]
    saved = stored(postgres_engine, space["id"])
    assert saved["withdrawal_reason"] == "m" * 200 and saved["withdrawn_by"] and saved["withdrawn_at"]
    history = moderations(postgres_engine, space["id"])
    assert [(row["action"], row["reason"]) for row in history] == [("withdraw", "m" * 200)]
    assert history[0]["admin_id"] == saved["withdrawn_by"]
    # Repeating the withdrawal keeps the first audit.
    assert withdraw(postgres_client, space["id"], admin_headers).status_code == 409
    assert stored(postgres_engine, space["id"]) == saved and len(moderations(postgres_engine)) == 1
    # Deshabilitado para catálogo y reservas nuevas.
    assert space["id"] not in {item["id"] for item in postgres_client.get("/api/spaces").json()}
    assert postgres_client.get(f"/api/spaces/public/{space['id']}").status_code == 404
    _, tenant_headers = authenticate(postgres_client, "arrendatario@example.com")
    assert reserve(postgres_client, space, tenant_headers).status_code == 409


def test_cp04_propietario_ve_motivo_no_reactiva_y_editar_conserva_retiro(postgres_client, postgres_engine):
    _, owner_headers, space = create_space(postgres_client)
    admin_headers = make_admin(postgres_client, postgres_engine)
    assert withdraw(postgres_client, space["id"], admin_headers).status_code == 200
    mine = postgres_client.get("/api/spaces/mine", headers=owner_headers).json()
    assert mine[0]["withdrawal_reason"] == REASON and mine[0]["withdrawn_at"]
    assert read_space(postgres_client, space, owner_headers)["withdrawal_reason"] == REASON
    assert status_change(postgres_client, space, owner_headers, True).status_code == 409
    edited = postgres_client.put(f"/api/spaces/{space['id']}", headers=owner_headers,
                                 json=update_data(space, name="Sala renombrada por dueño"))
    assert edited.status_code == 200
    assert edited.json()["is_withdrawn"] is True and edited.json()["withdrawal_reason"] == REASON
    # The owner cannot clear the audit by sending it in the update.
    tampered = postgres_client.put(f"/api/spaces/{space['id']}", headers=owner_headers,
                                   json=update_data(space, withdrawal_reason=None))
    assert tampered.status_code == 422
    assert stored(postgres_engine, space["id"])["withdrawal_reason"] == REASON


def test_cp05_retiro_conserva_reservas_y_su_pago_o_cancelacion_normal(
    postgres_client, postgres_engine, booking_setup,
):
    _, _, space, _, tenant_headers = booking_setup
    pending = reserve(postgres_client, space, tenant_headers).json()
    paid = reserve(postgres_client, space, tenant_headers, start_hour=13, end_hour=15).json()
    assert pay(postgres_client, paid["id"], tenant_headers).status_code == 200
    with Session(postgres_engine) as session:
        before = [row.model_dump() for row in session.exec(select(Reservation).order_by(Reservation.id))]
        payments_before = [row.model_dump() for row in session.exec(select(Payment).order_by(Payment.id))]
    admin_headers = make_admin(postgres_client, postgres_engine)
    assert withdraw(postgres_client, space["id"], admin_headers).status_code == 200
    with Session(postgres_engine) as session:
        assert [row.model_dump() for row in session.exec(select(Reservation).order_by(Reservation.id))] == before
        assert [row.model_dump() for row in session.exec(select(Payment).order_by(Payment.id))] == payments_before
    # Existing reservations keep the normal payment and cancellation rules.
    paid_now = pay(postgres_client, pending["id"], tenant_headers)
    assert paid_now.status_code == 200 and paid_now.json()["status"] == "paid"
    cancelled = cancel(postgres_client, paid["id"], tenant_headers)
    assert cancelled.status_code == 200 and cancelled.json()["payment"]["status"] == "refunded"


def test_cp06_levantar_retiro_deja_inactivo_y_dueno_reactiva_explicitamente(postgres_client, postgres_engine):
    _, owner_headers, space = create_space(postgres_client)
    admin_headers = make_admin(postgres_client, postgres_engine)
    assert restore(postgres_client, space["id"], admin_headers).status_code == 409
    assert withdraw(postgres_client, space["id"], admin_headers).status_code == 200
    response = restore(postgres_client, space["id"], admin_headers)
    assert response.status_code == 200 and response.headers["Cache-Control"] == "no-store"
    restored = response.json()
    assert (restored["is_active"], restored["is_withdrawn"]) == (False, False)
    assert (restored["withdrawal_reason"], restored["withdrawn_at"], restored["withdrawn_by_name"]) == (
        None, None, None)
    saved = stored(postgres_engine, space["id"])
    assert (saved["is_active"], saved["is_withdrawn"], saved["withdrawal_reason"], saved["withdrawn_by"]) == (
        False, False, None, None)
    assert [row["action"] for row in moderations(postgres_engine, space["id"])] == ["withdraw", "restore"]
    # Not published automatically against the owner's will.
    assert space["id"] not in {item["id"] for item in postgres_client.get("/api/spaces").json()}
    assert restore(postgres_client, space["id"], admin_headers).status_code == 409
    assert status_change(postgres_client, space, owner_headers, True).status_code == 200
    assert space["id"] in {item["id"] for item in postgres_client.get("/api/spaces").json()}


def test_cp07_retiro_previo_sin_auditoria_restriccion_y_borrado_en_cascada(postgres_client, postgres_engine):
    _, owner_headers, space = create_space(postgres_client)
    withdraw_space(postgres_engine, space)
    admin_headers = make_admin(postgres_client, postgres_engine)
    assert restore(postgres_client, space["id"], admin_headers).status_code == 200
    with Session(postgres_engine) as session:
        record = session.get(Space, UUID(space["id"]))
        record.withdrawal_reason = "Motivo sin retiro"
        with pytest.raises(IntegrityError) as failure:
            session.commit()
        assert failure.value.orig.diag.constraint_name == "ck_spaces_withdrawal_audit"
        session.rollback()
    assert withdraw(postgres_client, space["id"], admin_headers).status_code == 200
    # HU-06 still allows the owner to delete a withdrawn space without reservations.
    assert postgres_client.delete(f"/api/spaces/{space['id']}", headers=owner_headers).status_code == 204
    assert moderations(postgres_engine) == []


def test_cp08_fallo_de_base_de_datos_revierte_y_permite_reintentar(postgres_client, postgres_engine, monkeypatch):
    _, _, space = create_space(postgres_client)
    admin_headers = make_admin(postgres_client, postgres_engine)
    before = stored(postgres_engine, space["id"])

    def fail_commit(session):
        raise SQLAlchemyError("simulated")

    with monkeypatch.context() as patch:
        patch.setattr(Session, "commit", fail_commit)
        response = withdraw(postgres_client, space["id"], admin_headers)
    assert response.status_code == 503 and "Actualiza el listado" in response.json()["detail"]
    assert stored(postgres_engine, space["id"]) == before and moderations(postgres_engine) == []
    assert withdraw(postgres_client, space["id"], admin_headers).status_code == 200
