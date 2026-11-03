# RentSmart v2.0-entrega2

**Entrega 2 — CI/CD, reservas recibidas y pago simulado.** Conservamos el MVP e incorporamos dos requisitos funcionales, automatización de calidad, notificaciones y publicación HTTPS. El [GitHub Release](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/releases/tag/v2.0-entrega2) identifica el SHA estable, la fecha y las verificaciones finales; [PR #36](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/36) reúne el cierre documental.

## Funcionalidades y automatización

- **HU-14:** reservas recibidas del propietario, filtros por publicación propia, próximas/historial, estados efectivos e importes contratados.
- **CA-05 de HU-14:** cancelación confirmada del propietario, auditoría y reembolso simulado atómicos; backend compartido con HU-15. PR #33/#34 y migración 0007.
- **HU-16:** pago simulado aprobado/rechazado, reintento, referencia/importe/fecha persistidos y aprobación idempotente.
- **CI/CD:** push/PR, dependencias congeladas, build, migraciones, Jest/Pytest, reportes JSON/JUnit, artefactos, quality y fallo deliberado.
- **Producción:** Compose, Caddy/HTTPS y publicación por Actions/SSH desde main con migraciones y verificación de versión/readiness.
- **Slack:** resultados reales, despliegue omitido y sondas controladas, enlazados a cada ejecución.

## Pruebas y evidencias

La [CI #40967124896](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/40967124896), sobre 27ba0580232774fc65750c1974485381a1fcffa4, aprobó **150 Jest y 165 Pytest**, tipos/build, Alembic, **26 comprobaciones de infraestructura**, smoke, deploy y notify. [Su evidencia](../evidencias/REN-14-despliegue-ca05-2026-10-29.md) documenta HTTPS, versión/readiness, 0007 y contenedores sanos. Es una referencia histórica; los [checks del cierre](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/36/checks) y el Release conservan los resultados del candidato final.

La [sonda #40796674640](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/40796674640) falló deliberadamente después de aprobar sus tests de aplicación; verificó quality y el aviso FALLO artificial. El equipo confirmó recepción en Slack junto con la [CI normal #40796675009](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/40796675009). Separamos esas ejecuciones de los fallos reales y del candidato final.

Los conteos no son porcentajes de cobertura. Jest/RTL simula HTTP; Pytest usa PostgreSQL real; infraestructura se cuenta por separado.

## Instalación y actualización

Usamos Node.js 24, Python 3.12 y PostgreSQL 17. Seguimos [la instalación](../wiki/Instalacion-y-ejecucion.md) y [el despliegue](../despliegue.md):

```bash
git clone https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart.git
cd Pruebas-De-Software-RentSmart
git switch --detach v2.0-entrega2
```

Dependencias congeladas con npm ci y uv sync --frozen. Aplicamos alembic upgrade head antes de iniciar la API: 0006 agrega datos de pago y 0007 autor/fecha de cancelación opcionales para legados, sin inventar valores históricos. Conservamos respaldo antes de migraciones relevantes; no hay rollback automático del esquema. Compose local y producción son independientes. Los ejemplos de variables no contienen secretos.

## Problemas y soluciones

- Compilamos el frontend y servimos dist con Caddy.
- quality rechaza fallos, cancelaciones y omisiones; el notificador distingue sondas solicitadas de las ejecutadas.
- El primer deploy falló al interpretar la clave SSH; el segundo intento de [#40944029052](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/40944029052) publicó el mismo SHA después de corregir su carga.
- Actualizamos Wiki, instalación, ficha del video y declaración de IA.

## Limitaciones conocidas

- Pagos/reembolsos simulados, sin cargos reales ni tarjetas.
- Interfaz del arrendatario de HU-15, filtros temporales y otros requisitos finales fuera del hito.
- E2E/UI con Playwright para entrega 3; artefactos de Actions sujetos a retención.
- Verificamos acceso y duración del video; no afirmamos auditoría audiovisual completa ni un SHA extraído de su contenido.

## Enlaces de entrega

- [Aplicación HTTPS](https://rentsmart-usm-viveros.chilecentral.cloudapp.azure.com).
- [Video de entrega 2](https://drive.google.com/file/d/1bSMNsGrb_MBqMZ_D4iOy18PT9qu68TKA/view?usp=sharing), **22 min 44 s**; [ficha de acceso](../evidencias/REN-77-video-2026-11-02.md).
- [Wiki de entrega 2](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/wiki/Entrega-2).
- [Código etiquetado](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/tree/v2.0-entrega2) y [GitHub Release](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/releases/tag/v2.0-entrega2).
- [Matriz de la pauta](../cierre-entrega-2.md), [registro](../entrega-2.md), [Jira REN](https://rentsmartpsf.atlassian.net/jira/software/projects/REN).

**Equipo:** Jorge Aceval y Joaquín Viveros.
