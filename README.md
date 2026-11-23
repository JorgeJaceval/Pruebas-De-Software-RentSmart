# RentSmart

[![CI](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/workflows/ci.yml?query=branch%3Amain)
[![Release](https://img.shields.io/github/v/release/JorgeJaceval/Pruebas-De-Software-RentSmart)](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/releases/latest)

Plataforma para publicar espacios (salas, oficinas, talleres) y reservarlos por horario. Proyecto del ramo Pruebas de Software.

![Identidad de RentSmart](docs/identidad/logo.svg)

**App publicada:** <https://rentsmart-usm-viveros.chilecentral.cloudapp.azure.com> · **Wiki:** <https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/wiki> · **Jira:** [proyecto REN](https://rentsmartpsf.atlassian.net/jira/software/projects/REN)

## Entregas

| Entrega | Qué incluye | Enlaces |
| --- | --- | --- |
| 1 — MVP | CRUD de espacios, reservas, Jest y Pytest | [Wiki](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/wiki/Entrega-1) · [Release](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/releases/tag/v1.0-entrega1) · [Video](https://drive.google.com/file/d/17H2e4SKm3GOre0F0W0TxGIGKeGdF53n1/view?usp=sharing) |
| 2 — CI/CD | GitHub Actions, despliegue a Azure por HTTPS, Slack, pago simulado y reservas recibidas | [Wiki](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/wiki/Entrega-2) · [Release](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/releases/tag/v2.0-entrega2) · [Video](https://drive.google.com/file/d/1bSMNsGrb_MBqMZ_D4iOy18PT9qu68TKA/view?usp=sharing) |
| 3 — E2E | 19 pruebas Playwright en el pipeline, cancelación del arrendatario, filtro por horario, moderación e IA | [Wiki](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/wiki/Entrega-3) · [Release](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/releases/tag/v3.0-entrega3) · Video pendiente |

## Equipo

| Integrante | Rol |
| --- | --- |
| Jorge Aceval | Líder, backend (FastAPI, PostgreSQL, Pytest), CI/CD y despliegue |
| Joaquín Viveros | Frontend (React, Jest), pruebas de interfaz y E2E con Playwright |

Nos coordinamos por Discord y Jira. Más detalle en [organización](docs/organizacion.md).

## Tecnologías

React + TypeScript + Vite · Python + FastAPI · PostgreSQL + SQLModel + Alembic · Jest + React Testing Library · Pytest · Playwright · GitHub Actions · Docker Compose + Caddy en Azure.

## Funcionalidades

- Registro, inicio de sesión y permisos (HU-01, HU-02).
- Publicar, editar, activar/desactivar y eliminar espacios; panel Mis espacios (HU-03 a HU-07).
- Catálogo público con búsqueda, filtros y filtro por fecha y horario (HU-08, HU-09); detalle del espacio (HU-10).
- Horario de atención y reservas sin choques (HU-11, HU-12); Mis reservas (HU-13).
- Reservas recibidas por el propietario y cancelación con reembolso simulado (HU-14, HU-15).
- Pago simulado (HU-16).
- Sugerencia de descripción con IA usando Gemini (HU-17), con `GEMINI_API_KEY` en `.env`; sin clave, avisa que no está disponible.
- Moderación de publicaciones por un administrador (HU-18).

Cada historia tiene su documento en [`docs/HU-XX.md`](docs/) con criterios y pruebas.

## Ejecutar con Docker Compose

Requiere Docker con Compose (en Windows, Docker Desktop con contenedores Linux).

```bash
git clone https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart.git
cd Pruebas-De-Software-RentSmart
cp .env.example .env
# Pon en AUTH_SECRET_KEY un valor aleatorio de al menos 32 caracteres, por ejemplo:
#   python -c "import secrets; print(secrets.token_hex(32))"
docker compose up --build -d --wait
```

| Servicio | Dirección |
| --- | --- |
| Aplicación | <http://localhost:5173> |
| API (OpenAPI) | <http://localhost:8000/docs> |
| Salud de API y base | <http://localhost:8000/api/health/ready> |

Las migraciones se aplican solas al iniciar. Para detener: `docker compose down`.

Para desarrollar sin contenedores (backend con `uv`, frontend con `npm run dev`), ver [instalación y ejecución](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/wiki/Instalacion-y-ejecucion).

## Pruebas

```bash
(cd frontend && npm run test:ci)      # Jest (185)
(cd backend && uv run pytest -q)      # Pytest con PostgreSQL real (273)
bash scripts/run-e2e.sh               # Playwright E2E en entorno temporal (19)
```

Pytest necesita PostgreSQL (`docker compose up -d --wait db`). La E2E levanta su propio entorno y lo borra al terminar; ver la [guía E2E](docs/testing/e2e.md).

La CI corre todo esto en cada PR y push a `develop` o `main`; si algo falla, no se puede integrar ni desplegar. El resultado llega a Slack (`#rentsmart-ci`).

## Flujo de trabajo

GitFlow: `main` para versiones, `develop` para integrar y ramas `feature/REN-<n>-<descripcion>`. La clave de Jira va en la rama, los commits y el título de la PR. Cada PR necesita la CI en verde. Ver [CONTRIBUTING.md](CONTRIBUTING.md).

## Estructura

```text
backend/    API FastAPI, migraciones Alembic y pruebas Pytest
frontend/   Interfaz React, pruebas Jest y E2E Playwright (frontend/e2e)
scripts/    Lanzador E2E y verificación de despliegue
docs/       Historias, evidencias, guías y fuentes de la Wiki
.github/workflows/ci.yml   Pipeline
```

## Documentación

- [Wiki](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/wiki) (fuentes en [`docs/wiki`](docs/wiki/README.md)).
- [Despliegue](docs/despliegue.md) y [notificaciones a Slack](docs/notificaciones-slack.md).
- [Requerimientos y reglas de negocio](docs/requerimientos.md).
- Registros de trabajo: [entrega 1](docs/entrega-1.md), [entrega 2](docs/entrega-2.md), [entrega 3](docs/entrega-3.md); matrices de cierre: [entrega 2](docs/cierre-entrega-2.md), [entrega 3](docs/cierre-entrega-3.md).

## Licencia

[MIT](LICENSE). © 2026 Jorge Aceval y Joaquín Viveros.
