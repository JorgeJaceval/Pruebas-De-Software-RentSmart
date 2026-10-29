# REN-84 — Primer despliegue público verificado

El **29 de octubre de 2026** publicamos RentSmart mediante GitHub Actions, SSH y Docker Compose/Caddy en el VPS de Azure de Chile Central.

| Elemento | Evidencia |
| --- | --- |
| Aplicación | [RentSmart por HTTPS](https://rentsmart-usm-viveros.chilecentral.cloudapp.azure.com) |
| Revisión publicada | `ff19bc37918b10402779c9f8647798b6eff707d6` |
| Revisión humana | [PR #28](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/28), aprobado e integrado en `main` |
| CI del merge | [#40941984297](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/40941984297), aprobada |
| Publicación | [#40944029052](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/40944029052), **intento 2 aprobado** |
| Pipeline | `frontend`, `backend`, `quality`, `production`, `deploy` y `notify` aprobados |
| Estado de activación | `DEPLOY_ENABLED=true`; siguientes publicaciones sujetas a `main`, CI y ambiente `production` |

## Incidencia y reintento

El intento 1 aprobó **134 Jest, 144 Pytest, 26 comprobaciones de infraestructura y smoke**, pero `deploy` falló con código 255 y `error in libcrypto` al cargar la clave de `SSH_PRIVATE_KEY`. La validación terminó antes de conectar/transferir código y comprobamos que no había releases ni contenedores de producción. Slack notificó el fallo real. Desactivamos nuevas publicaciones mientras se corregía el secreto.

El usuario confirmó que cargó la clave completa y comprobamos que GitHub actualizó el secreto. El archivo dedicado local ya era válido y autenticaba correctamente. Reactivamos el despliegue y reejecutamos los jobs fallidos y sus dependientes sobre **el mismo SHA**. El intento 2 validó la clave/host, transfirió el código versionado, construyó las imágenes, aplicó Alembic hasta `0006_payment_simulation`, inició los servicios, comprobó revisión/readiness y registró `current`. Slack confirmó el envío de ÉXITO. Las suites aprobadas del intento 1 se conservan como evidencia de esa misma revisión; no las contamos de nuevo por el reintento.

No conocemos el contenido anterior del secreto ni atribuimos el fallo a una causa de copia específica. No cambiamos aplicación, scripts, workflow o claves del servidor para superar la validación.

## Verificación independiente de Actions

Desde el equipo de trabajo ejecutamos, con validación TLS normal:

```bash
bash scripts/verify-deployment.sh \
  https://rentsmart-usm-viveros.chilecentral.cloudapp.azure.com \
  ff19bc37918b10402779c9f8647798b6eff707d6
```

Resultado, código 0:

```text
Versión verificada: ff19bc37918b10402779c9f8647798b6eff707d6; API y PostgreSQL disponibles.
```

También comprobamos:

1. `/version.json` coincide con el SHA aprobado y `/api/health/ready` confirma `status=ok`, `database=connected`.
2. La página HTTPS responde 200 y contiene el nodo `root` de React.
3. HTTP redirige a HTTPS. No usamos `--insecure` ni desactivamos la validación de certificados.
4. SSH estricto confirma `current` en `/opt/rentsmart/releases/ff19bc37918b10402779c9f8647798b6eff707d6.Sj0lUkpC`.
5. `rentsmart-production-backend-1`, `rentsmart-production-db-1` y `rentsmart-production-frontend-1` están `healthy`. Las imágenes de aplicación llevan el SHA publicado.
6. Solo Caddy publica TCP 80/443 en el host; FastAPI 8000 y PostgreSQL 5432 permanecen internos. El archivo remoto `shared/.env` conserva permisos 600 y propiedad del usuario de despliegue.

Estas comprobaciones HTTP y de infraestructura son de entrega 2: no agregamos casos de navegador/E2E/UI ni creamos cuentas o reservas de prueba en producción. La evidencia describe la revisión y el momento comprobados; un cambio posterior requiere verificar su propio SHA. Wiki publicada, cápsula de video y tag/GitHub Release finales continúan pendientes de REN-77.
