from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class RegistrationError(Exception):
    def __init__(self, status_code: int, detail: str, errors: dict[str, str]):
        # Do not attach request data or database exceptions to public failures.
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail
        self.errors = errors


class AuthenticationError(Exception):
    def __init__(self, status_code: int, detail: str):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


async def authentication_error_handler(
    request: Request, error: AuthenticationError
) -> JSONResponse:
    headers = {"WWW-Authenticate": "Bearer"} if error.status_code == 401 else {}
    return JSONResponse(
        status_code=error.status_code,
        content={"detail": error.detail},
        headers=headers,
    )


async def registration_error_handler(
    request: Request, error: RegistrationError
) -> JSONResponse:
    return JSONResponse(
        status_code=error.status_code,
        content={"detail": error.detail, "errors": error.errors},
    )


async def validation_error_handler(
    request: Request, error: RequestValidationError
) -> JSONResponse:
    is_login = request.url.path == "/api/auth/login"
    errors: dict[str, str] = {}
    missing_messages = {
        "name": "Ingresa tu nombre.",
        "email": "Ingresa tu correo.",
        "password": "Ingresa una contraseña.",
    }
    invalid_messages = {
        "name": "El nombre debe tener entre 2 y 80 caracteres.",
        "email": "Ingresa un correo válido.",
        "password": "La contraseña debe tener entre 8 y 64 caracteres.",
    }
    if is_login:
        invalid_messages["password"] = "Ingresa una contraseña válida."

    for failure in error.errors():
        if failure["type"] == "extra_forbidden":
            errors["form"] = (
                "El inicio de sesión solo acepta correo y contraseña."
                if is_login
                else "El registro solo acepta nombre, correo y contraseña."
            )
            continue

        location = failure.get("loc", ())
        field = location[1] if len(location) == 2 and location[0] == "body" else None
        if field in invalid_messages:
            if failure["type"] in {"text_encoding", "name_null_byte"}:
                errors.setdefault(field, "El campo contiene caracteres no válidos.")
                continue
            messages = (
                missing_messages if failure["type"] == "missing" else invalid_messages
            )
            errors.setdefault(field, messages[field])
        else:
            errors.setdefault("form", "Revisa los datos del formulario.")

    return JSONResponse(
        status_code=422,
        content={
            "detail": "Revisa los datos del formulario.",
            "errors": errors or {"form": "Revisa los datos del formulario."},
        },
    )
