from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from app.errors import (
    AuthenticationError,
    RegistrationError,
    SpaceError,
    authentication_error_handler,
    registration_error_handler,
    space_error_handler,
    validation_error_handler,
)
from app.routers.auth import router as auth_router
from app.routers.health import router as health_router
from app.routers.spaces import router as spaces_router
from app.settings import Settings, get_settings


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    application = FastAPI(
        title="RentSmart API",
        description="Arriendo de espacios entre particulares.",
        version="0.1.0",
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"],
    )
    application.add_exception_handler(RegistrationError, registration_error_handler)
    application.add_exception_handler(AuthenticationError, authentication_error_handler)
    application.add_exception_handler(SpaceError, space_error_handler)
    application.add_exception_handler(RequestValidationError, validation_error_handler)
    application.dependency_overrides[get_settings] = lambda: settings

    @application.middleware("http")
    async def prevent_session_caching(request: Request, call_next):
        response = await call_next(request)
        if request.url.path in {
            "/api/auth/login",
            "/api/auth/me",
            "/api/auth/admin-access",
        } or request.url.path.rstrip("/") == "/api/spaces" or request.url.path.startswith(
            "/api/spaces/"
        ):
            response.headers["Cache-Control"] = "no-store"
        return response

    application.include_router(auth_router, prefix="/api")
    application.include_router(health_router, prefix="/api")
    application.include_router(spaces_router, prefix="/api")
    return application


app = create_app()
