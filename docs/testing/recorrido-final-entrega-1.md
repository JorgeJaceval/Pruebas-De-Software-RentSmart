# Pruebas manuales integradas — Entrega 1

Ejecución: **12 de octubre de 2026, America/Santiago**. Versión: `v1.0-entrega1`, commit `5c0fabce255b9b0c9d886c0fae627a790060b6f8`.

## Entorno y datos

Windows, Docker Desktop con contenedores Linux, PostgreSQL 17, FastAPI y Vite/React. Iniciamos una instancia aislada desde un volumen nuevo:

```bash
docker compose -p rentsmart-entrega1-final up --build -d --wait
```

Las migraciones `0001` a `0005` se aplicaron correctamente; `/api/health/ready` respondió 200. La aplicación se abrió en `http://localhost:5173`. La clave de sesión se generó localmente en `.env`, excluido de Git.

Creamos mediante la interfaz dos cuentas de prueba con dominio `example.com`: propietario y arrendatario. Usamos una sala de reuniones de Santiago, capacidad 8, horario 09:00–18:00 y tarifa inicial de $12.000 CLP/h.

## Procedimiento y resultados observados

| Paso | HU | Acción y resultado observado |
| --- | --- | --- |
| 1 | HU-01 | Registrar propietario: API 201 y «Tu cuenta fue creada». |
| 2 | HU-02 | Intentar acceso con contraseña incorrecta: API 401 y «Correo o contraseña incorrectos». Corregirla: 200 y acceso a Mis espacios. |
| 3 | HU-07 | Cuenta sin publicaciones: explicación de lista vacía y acceso a publicar, sin mensaje de error. |
| 4 | HU-03/11 | Publicar «Sala Entrega Final» con los datos válidos: API 201, confirmación y horario diario Santiago 09:00–18:00. |
| 5 | HU-08/09 | Encontrar la tarjeta en catálogo. Buscar «inexistente»: aviso sin coincidencias. Buscar «ENTREGA»: aparece la sala. |
| 6 | HU-10 | Abrir detalle: datos, descripción, tarifa y horario correctos; el propietario recibe «Este es tu espacio. No puedes reservarlo». |
| 7 | HU-04/07 | Editar nombre a «Sala Entrega Final Editada» y tarifa a $15.000: PUT 200. Tras navegar nuevamente a Mis espacios, ambos valores se conservan. |
| 8 | HU-05/08 | Desactivar: PATCH 200, estado inactivo y catálogo vacío. Volver a Mis espacios y activar: PATCH 200 y estado activo. |
| 9 | HU-06 | Abrir eliminación y cancelar: conserva la tarjeta. Confirmar nuevamente «Eliminar definitivamente»: DELETE 204, aviso de eliminación y panel vacío. |
| 10 | HU-01/02/03 | Publicar «Sala Reserva Entrega 1» a $12.000/h; cerrar sesión, registrar arrendatario e iniciar sesión con esa cuenta. |
| 11 | HU-10/11/12 | Seleccionar 14-10-2026, 10:00–12:00. Interfaz calcula 2 horas y $24.000. Solicitar: API 201 y contrato persistido con reserva y registro de pago pendientes. |
| 12 | HU-12 | Recuperar confirmación por URL y repetir el mismo intervalo antes del vencimiento: API 409 y «Este horario ya no está disponible. Elige otro intervalo». |
| 13 | HU-13 | Abrir Mis reservas: una reserva pendiente, horario 10:00–12:00 y total $24.000. Pagar/cancelar deshabilitados con explicación de su implementación pendiente. Abrir «Ver reserva» recupera el mismo identificador. |

**Resultado: los 13 pasos obtuvieron los resultados esperados.** Este recorrido manual complementa los 99 CP documentados y las 212 comprobaciones automatizadas.

## Evidencia

El [registro HTTP de la ejecución](../evidencias/entrega1-recorrido-api.txt) conserva las respuestas 201/200/401/204/409 observadas, sin contraseñas ni tokens.

- Publicación auxiliar eliminada: `083f6f3f-af39-42ec-ac7d-aa0ae53a9606`.
- Publicación conservada para reserva: `dd23d2e3-e421-435f-9ae2-946388e257d6`.
- Reserva creada: `ef31d37d-0253-444e-ad06-cc47468f806a`.
- Reserva: 14 de octubre, 10:00–12:00 Santiago; 2 horas × $12.000 = $24.000.
- Plazo observado: 12 de octubre, 23:01:03 Santiago. El estado depende de la hora: después de vencer, la consulta mostrará expiración.

Después de crear la reserva y rechazar su duplicado, una consulta a PostgreSQL confirmó **2 usuarios, 1 espacio, 1 reserva y 1 pago**, y **0 filas** para la publicación auxiliar eliminada. Se verificaron la persistencia y el rechazo del intervalo duplicado. Las solicitudes simultáneas se comprueban mediante pruebas de concurrencia con Pytest.

## Reproducción

El procedimiento se realiza desde la interfaz web, con API y PostgreSQL reales. Las pruebas de permisos, valores límite, expiración y concurrencia se complementan con Jest y Pytest.

Para reproducir en una base nueva, seguir los pasos en orden, crear correos sintéticos distintos y elegir una fecha futura dentro de 90 días. Repetir el conflicto antes de 15 minutos. La eliminación utiliza exclusivamente una publicación auxiliar sin reservas; la publicación reservada se conserva. Docker guarda estos datos en el volumen `rentsmart-entrega1-final_postgres_data`.
