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

    for failure in error.errors():
        if failure["type"] == "extra_forbidden":
            errors["form"] = (
                "El registro solo acepta nombre, correo y contraseña."
            )
            continue

        location = failure.get("loc", ())
        field = location[1] if len(location) == 2 and location[0] == "body" else None
        if field in invalid_messages:
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
