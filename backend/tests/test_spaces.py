import json
from uuid import UUID, uuid4

import pytest
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlmodel import Session, select

from app.models import Space, User

pytestmark = pytest.mark.postgres


def publication(**changes):
    return {
        "name": "Sala de reuniones central",
        "description": "Espacio luminoso equipado para reuniones de equipo.",
        "category": "meeting_room",
        "commune": "Providencia",
        "location_reference": "A una cuadra del metro Pedro de Valdivia.",
        "capacity": 12,
        "price_per_hour": 15000,
        "conditions": "Mantener el espacio limpio al finalizar la reunión.",
        "photos": ["https://example.com/sala.jpg"],
        **changes,
    }


def authenticate(client, email="propietario@example.com"):
    account = {
        "name": "Persona de Prueba", "email": email, "password": "Clave de prueba 2026!"
    }
    response = client.post("/api/auth/register", json=account)
    assert response.status_code == 201
    user = response.json()
    response = client.post(
        "/api/auth/login", json={key: account[key] for key in ("email", "password")}
    )
    assert response.status_code == 200
    return user, {"Authorization": f"Bearer {response.json()['access_token']}"}


def stored_spaces(engine):
    with Session(engine) as session:
        return session.exec(select(Space)).all()


def assert_invalid(response, field):
    assert response.status_code == 422
    assert set(response.json()["errors"]) == {field}
    assert response.headers["Cache-Control"] == "no-store"


def assert_database_rejects(engine, owner_id, field, value, constraint):
    with Session(engine) as session:
        space = Space(owner_id=UUID(owner_id), **publication(**{field: value}))
        session.add(space)
        with pytest.raises(IntegrityError) as failure:
            session.commit()
        assert failure.value.orig.diag.constraint_name == constraint
        session.rollback()


def test_cp01_publicacion_completa_persistente_y_consulta_propia(postgres_client, postgres_engine):
    user, headers = authenticate(postgres_client)
    payload = publication()
    for field in ("name", "description", "commune", "location_reference", "conditions"):
        payload[field] = f"  {payload[field]}  "
    payload["photos"] = ["  https://EXAMPLE.com/sala.jpg  "]
    response = postgres_client.post("/api/spaces", headers=headers, json=payload)
    assert response.status_code == 201
    expected = {
        **publication(), "opening_hour": 9, "closing_hour": 18,
        "owner_id": user["id"], "is_active": True,
    }
    body = response.json()
    assert UUID(body["id"])
    assert body == {**expected, "id": body["id"]}
    assert response.headers["Cache-Control"] == "no-store"
    stored = stored_spaces(postgres_engine)
    assert len(stored) == 1
    assert str(stored[0].id) == body["id"]
    assert str(stored[0].owner_id) == user["id"]
    assert stored[0].is_active is True
    assert stored[0].photos == publication()["photos"]
    assert stored[0].opening_hour == 9 and stored[0].closing_hour == 18
    persisted = postgres_client.get(f"/api/spaces/{body['id']}", headers=headers)
    assert persisted.status_code == 200 and persisted.json() == body
    assert persisted.headers["Cache-Control"] == "no-store"
    missing = postgres_client.get(f"/api/spaces/{uuid4()}", headers=headers)
    assert missing.status_code == 404
    assert missing.headers["Cache-Control"] == "no-store"


def test_cp02_campos_requeridos_y_textos_invalidos(postgres_client, postgres_engine):
    _, headers = authenticate(postgres_client)
    for field in publication():
        payload = {key: value for key, value in publication().items() if key != field}
        assert_invalid(postgres_client.post("/api/spaces", headers=headers, json=payload), field)
    limits = {
        "name": (5, 80), "description": (20, 1000), "commune": (2, 80),
        "location_reference": (5, 150), "conditions": (10, 500),
    }
    for field, (minimum, maximum) in limits.items():
        for value in (" " * minimum, "x" * (minimum - 1), "x" * (maximum + 1),
                      "Texto\x00inválido para este campo", "Texto\ud800inválido", 123, None):
            response = postgres_client.post(
                "/api/spaces", headers={**headers, "Content-Type": "application/json"},
                content=json.dumps(publication(**{field: value}), ensure_ascii=True),
            )
            assert_invalid(response, field)
            assert "123" not in response.text
    for boundary in (0, 1):
        payload = publication(**{field: "x" * limit[boundary] for field, limit in limits.items()})
        response = postgres_client.post("/api/spaces", headers=headers, json=payload)
        assert response.status_code == 201
    assert len(stored_spaces(postgres_engine)) == 2


def test_cp03_capacidad_limites_tipos_y_restriccion_postgres(postgres_client, postgres_engine):
    user, headers = authenticate(postgres_client)
    for capacity in (0, 101, True, 12.5, 12.0, "12", None):
        assert_invalid(postgres_client.post(
            "/api/spaces", headers=headers, json=publication(capacity=capacity)
        ), "capacity")
    assert stored_spaces(postgres_engine) == []
    for capacity in (1, 100):
        response = postgres_client.post(
            "/api/spaces", headers=headers, json=publication(capacity=capacity)
        )
        assert response.status_code == 201 and response.json()["capacity"] == capacity
    assert_database_rejects(postgres_engine, user["id"], "capacity", 0, "ck_spaces_capacity")
    assert len(stored_spaces(postgres_engine)) == 2


def test_cp04_precio_entero_limites_y_restriccion_postgres(postgres_client, postgres_engine):
    user, headers = authenticate(postgres_client)
    for price in (499, 500001, True, 15000.5, 15000.0, "15000", None):
        assert_invalid(postgres_client.post(
            "/api/spaces", headers=headers, json=publication(price_per_hour=price)
        ), "price_per_hour")
    assert stored_spaces(postgres_engine) == []
    for price in (500, 500000):
        response = postgres_client.post(
            "/api/spaces", headers=headers, json=publication(price_per_hour=price)
        )
        assert response.status_code == 201 and response.json()["price_per_hour"] == price
    assert_database_rejects(
        postgres_engine, user["id"], "price_per_hour", 499, "ck_spaces_price_per_hour"
    )
    assert len(stored_spaces(postgres_engine)) == 2


def test_cp05_categoria_y_horarios(postgres_client, postgres_engine):
    user, headers = authenticate(postgres_client)
    assert_invalid(postgres_client.post(
        "/api/spaces", headers=headers, json=publication(category="categoria-desconocida")
    ), "category")
    invalid_hours = [
        ({"opening_hour": -1}, "opening_hour"),
        ({"opening_hour": True}, "opening_hour"),
        ({"closing_hour": 24}, "closing_hour"),
        ({"closing_hour": 18.0}, "closing_hour"),
        ({"opening_hour": 9, "closing_hour": 9}, "closing_hour"),
        ({"opening_hour": 22}, "closing_hour"),
        ({"closing_hour": 2}, "closing_hour"),
    ]
    for hours, field in invalid_hours:
        assert_invalid(postgres_client.post(
            "/api/spaces", headers=headers, json=publication(**hours)
        ), field)
    assert stored_spaces(postgres_engine) == []
    for category in ("meeting_room", "photo_studio", "multipurpose_room"):
        response = postgres_client.post("/api/spaces", headers=headers, json=publication(
            category=category, opening_hour=0, closing_hour=23
        ))
        assert response.status_code == 201
        assert response.json()["opening_hour"] == 0 and response.json()["closing_hour"] == 23
    assert_database_rejects(postgres_engine, user["id"], "category", "otro", "ck_spaces_category")
    assert_database_rejects(postgres_engine, user["id"], "closing_hour", 9, "ck_spaces_hours")
    assert len(stored_spaces(postgres_engine)) == 3


def test_cp06_sesion_y_propietario_no_manipulables(postgres_client, postgres_engine):
    user, headers = authenticate(postgres_client)
    for invalid_headers in ({}, {"Authorization": "Bearer token-invalido"}):
        response = postgres_client.post("/api/spaces", headers=invalid_headers, json=publication())
        assert response.status_code == 401
        assert response.headers["Cache-Control"] == "no-store"
    for field, value in (("owner_id", str(uuid4())), ("id", str(uuid4())), ("is_active", False)):
        assert_invalid(postgres_client.post(
            "/api/spaces", headers=headers, json=publication(**{field: value})
        ), "form")
    assert stored_spaces(postgres_engine) == []
    response = postgres_client.post("/api/spaces", headers=headers, json=publication())
    assert response.status_code == 201 and response.json()["owner_id"] == user["id"]
    path = f"/api/spaces/{response.json()['id']}"
    for invalid_headers in ({}, {"Authorization": "Bearer token-invalido"}):
        denied = postgres_client.get(path, headers=invalid_headers)
        assert denied.status_code == 401
        assert denied.headers["Cache-Control"] == "no-store"
    other_user, other_headers = authenticate(postgres_client, "otro@example.com")
    with Session(postgres_engine) as session:
        admin = session.get(User, UUID(other_user["id"]))
        admin.is_admin = True
        session.add(admin)
        session.commit()
    denied = postgres_client.get(path, headers=other_headers)
    assert denied.status_code == 403
    assert denied.headers["Cache-Control"] == "no-store"
    assert "Sala de reuniones central" not in denied.text
    assert_database_rejects(
        postgres_engine, str(uuid4()), "capacity", 1, "fk_spaces_owner_id_users"
    )
    assert len(stored_spaces(postgres_engine)) == 1


def test_cp07_fotos_https_cantidad_y_restriccion_postgres(postgres_client, postgres_engine):
    user, headers = authenticate(postgres_client)
    photo = publication()["photos"][0]
    for photos in ([], [photo] * 4, ["http://example.com/sala.jpg"], ["texto-invalido"],
                   ["javascript:alert(1)"], ["https://"], [123], "https://example.com/sala.jpg",
                   ["https://example.com/\x00.jpg"], None):
        assert_invalid(postgres_client.post(
            "/api/spaces", headers=headers, json=publication(photos=photos)
        ), "photos")
    assert stored_spaces(postgres_engine) == []
    for count in (1, 3):
        response = postgres_client.post(
            "/api/spaces", headers=headers, json=publication(photos=[photo] * count)
        )
        assert response.status_code == 201 and len(response.json()["photos"]) == count
    for photos in ([], [photo] * 4):
        assert_database_rejects(
            postgres_engine, user["id"], "photos", photos, "ck_spaces_photos_count"
        )
    assert len(stored_spaces(postgres_engine)) == 2


def test_cp08_fallo_base_de_datos_rollback_y_reintento(
    postgres_client, postgres_engine, monkeypatch
):
    _, headers = authenticate(postgres_client)
    original_commit = Session.commit
    original_rollback = Session.rollback
    rolled_back = []

    def fail_publication_commit(session):
        if any(isinstance(value, Space) for value in session.new):
            session.flush()  # Real INSERT in the transaction, before the simulated failure.
            raise SQLAlchemyError("postgresql://secret-user:secret-password@private-db/internal")
        original_commit(session)

    def track_rollback(session):
        rolled_back.append(True)
        original_rollback(session)

    with monkeypatch.context() as failure:
        failure.setattr(Session, "commit", fail_publication_commit)
        failure.setattr(Session, "rollback", track_rollback)
        response = postgres_client.post("/api/spaces", headers=headers, json=publication())
    assert response.status_code == 503
    assert response.json() == {
        "detail": "No pudimos publicar tu espacio. Inténtalo nuevamente.",
        "errors": {"form": "No pudimos publicar tu espacio. Inténtalo nuevamente."},
    }
    assert response.headers["Cache-Control"] == "no-store"
    assert "secret-password" not in response.text and "private-db" not in response.text
    assert rolled_back and stored_spaces(postgres_engine) == []
    response = postgres_client.post("/api/spaces", headers=headers, json=publication())
    assert response.status_code == 201
    assert len(stored_spaces(postgres_engine)) == 1
