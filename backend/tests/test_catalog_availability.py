"""REN-9: public temporal search shares the reservation rules and preserves privacy."""
from datetime import datetime, timedelta, timezone

import pytest
from sqlmodel import Session

from test_public_catalog import assert_safe_failure, fail_database_query, public_data
from test_reservations import booking_setup, clock, records, request_data, reserve
from test_space_status import status_change, withdraw_space
from test_space_updates import NOW, SANTIAGO, seed_reservation
from test_spaces import publication

pytestmark = pytest.mark.postgres


def interval(space, **changes):
    return {key: value for key, value in request_data(space, **changes).items() if key != 'space_id'}


def search(client, space, **changes):
    return client.get('/api/spaces', params=interval(space, **changes))


def test_horario_compatible_visibilidad_contrato_publico_y_and(postgres_client, postgres_engine, booking_setup):
    _, owner_headers, space, _, headers = booking_setup
    # One compatible, one narrow, two hidden; all other fields are valid publications.
    compatible = postgres_client.post('/api/spaces', headers=owner_headers, json=publication(name='Sala compatible')).json()
    narrow = postgres_client.post('/api/spaces', headers=owner_headers, json=publication(name='Sala horario corto', opening_hour=13, closing_hour=18)).json()
    inactive = postgres_client.post('/api/spaces', headers=owner_headers, json=publication(name='Sala inactiva temporal')).json()
    withdrawn = postgres_client.post('/api/spaces', headers=owner_headers, json=publication(name='Sala retirada temporal')).json()
    assert status_change(postgres_client, inactive, owner_headers, False).status_code == 200
    withdraw_space(postgres_engine, withdrawn)
    assert reserve(postgres_client, space, headers).status_code == 201
    response = search(postgres_client, space)
    assert response.status_code == 200 and response.json() == [public_data(compatible)]
    assert response.headers['Cache-Control'] == 'no-store'
    assert all(field not in response.text for field in ('tenant_id', 'payment_expires_at', 'owner_id'))
    # Without an interval the old public catalogue contract remains unchanged.
    assert {item['id'] for item in postgres_client.get('/api/spaces').json()} == {space['id'], compatible['id'], narrow['id']}


@pytest.mark.parametrize('start,end,blocked', [(9,10,False),(12,13,False),(9,11,True),(10,12,True),(11,13,True),(9,13,True)])
def test_superposicion_semiabierta_y_horas_consecutivas(postgres_client, booking_setup, start, end, blocked):
    _, _, space, _, headers = booking_setup
    assert reserve(postgres_client, space, headers).status_code == 201
    response = search(postgres_client, space, start_hour=start, end_hour=end)
    assert response.status_code == 200
    assert bool(response.json()) is not blocked
    # The same decision is made when creating a real reservation.
    assert reserve(postgres_client, space, headers, start_hour=start, end_hour=end).status_code == (409 if blocked else 201)


@pytest.mark.parametrize('status,expiry,blocked', [
    ('paid',0,True), ('pending_payment',1,True), ('pending_payment',0,False),
    ('pending_payment',-1,False), ('cancelled',1,False), ('expired',1,False), ('completed',1,False),
])
def test_estado_y_expiracion_efectiva_compartidos(postgres_client, postgres_engine, booking_setup, status, expiry, blocked):
    _, _, space, tenant, headers = booking_setup
    seed_reservation(postgres_engine, space, tenant['id'], status=status,
                     payment_expires_at=NOW+timedelta(seconds=expiry))
    response = search(postgres_client, space)
    assert response.status_code == 200 and bool(response.json()) is not blocked
    assert reserve(postgres_client, space, headers).status_code == (409 if blocked else 201)


@pytest.mark.parametrize('changes', [
    {'date':'2026-02-30'}, {'date':'not-a-date'}, {'date':'9999-12-31'},
    {'start_hour':'1.0'}, {'start_hour':'true'}, {'start_hour':'-1'}, {'end_hour':'24'},
    {'start_hour':12,'end_hour':10}, {'start_hour':10,'end_hour':10},
    {'start_hour':0,'end_hour':9}, {'date':'2026-07-14'},
])
def test_intervalos_invalidos_no_se_convierten_en_catalogo_sin_filtro(postgres_client, booking_setup, changes):
    _, _, space, _, _ = booking_setup
    response = search(postgres_client, space, **changes)
    assert response.status_code == 422
    assert response.headers['Cache-Control'] == 'no-store'
    assert 'errors' in response.json()


@pytest.mark.parametrize('params', [{'date':'2026-07-16'}, {'start_hour':'10','end_hour':'12'},
                                    {'date':'2026-07-16','start_hour':'10'},
                                    {'date':'','start_hour':'10','end_hour':'12'}])
def test_requiere_los_tres_componentes(postgres_client, params):
    response = postgres_client.get('/api/spaces', params=params)
    assert response.status_code == 422
    assert response.json()['detail'] == 'Completa fecha, hora de inicio y hora de término.'


def test_limites_ahora_y_noventa_dias_se_comparten(postgres_client, booking_setup, clock):
    _, _, space, _, headers = booking_setup
    assert search(postgres_client, space, date='2026-07-15').status_code == 422  # exactly now
    boundary = NOW+timedelta(days=90)
    day = boundary.astimezone(SANTIAGO).date().isoformat()
    hour = boundary.astimezone(SANTIAGO).hour  # DST can change the local hour during 90 days.
    assert search(postgres_client, space, date=day, start_hour=hour, end_hour=hour+1).status_code == 200
    assert search(postgres_client, space, date=day, start_hour=hour+1, end_hour=hour+2).status_code == 422
    assert reserve(postgres_client, space, headers, date=day, start_hour=hour+1, end_hour=hour+2).status_code == 422


@pytest.mark.parametrize('date,start,end,reason', [('2026-09-06',0,1,'no existe'), ('2026-04-04',22,23,'se repite')])
def test_hora_de_cambio_en_santiago_no_se_normaliza(postgres_client, booking_setup, clock, date, start, end, reason):
    _, _, space, _, headers = booking_setup
    clock['now'] = (datetime.fromisoformat(date).replace(tzinfo=SANTIAGO)-timedelta(days=1)).astimezone(timezone.utc)
    params = {'date':date,'start_hour':start,'end_hour':end}
    response = search(postgres_client, space, **params)
    assert response.status_code == 422 and reason in response.json()['detail']
    assert reserve(postgres_client, space, headers, **params).status_code == 422


def test_fallo_sql_no_expone_datos_y_reintento_funciona(postgres_client, booking_setup, monkeypatch):
    _, _, space, _, _ = booking_setup
    with monkeypatch.context() as failure:
        failure.setattr(Session, 'exec', fail_database_query)
        response = search(postgres_client, space)
    assert_safe_failure(response, 'No pudimos consultar los espacios disponibles. Inténtalo nuevamente.')
    assert search(postgres_client, space).json() == [public_data(space)]


def test_consulta_no_promete_reserva_futura_y_no_muta_filas(postgres_client, postgres_engine, booking_setup):
    _, _, space, _, headers = booking_setup
    assert search(postgres_client, space).json() == [public_data(space)]
    assert records(postgres_engine) == ([], [])
    assert reserve(postgres_client, space, headers).status_code == 201
    snapshot = [[item.model_dump() for item in group] for group in records(postgres_engine)]
    assert search(postgres_client, space).json() == []
    assert [[item.model_dump() for item in group] for group in records(postgres_engine)] == snapshot
    assert reserve(postgres_client, space, headers).status_code == 409
