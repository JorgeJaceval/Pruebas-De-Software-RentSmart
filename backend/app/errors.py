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


class SpaceError(Exception):
    def __init__(self, status_code: int, detail: str, errors: dict[str, str] | None = None):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail
        self.errors = errors or {"form": detail}


async def space_error_handler(request: Request, error: SpaceError) -> JSONResponse:
    return JSONResponse(
        status_code=error.status_code,
        content={"detail": error.detail, "errors": error.errors},
    )


def space_validation_response(error: RequestValidationError) -> JSONResponse:
    invalid_messages = {
        "name": "El nombre debe tener entre 5 y 80 caracteres.",
        "description": "La descripción debe tener entre 20 y 1000 caracteres.",
        "category": "Selecciona una categoría válida.",
        "commune": "La comuna debe tener entre 2 y 80 caracteres.",
        "location_reference": "La referencia debe tener entre 5 y 150 caracteres.",
        "capacity": "La capacidad debe ser un entero entre 1 y 100 personas.",
        "price_per_hour": "El precio debe ser un entero entre $500 y $500.000 CLP.",
        "conditions": "Las condiciones deben tener entre 10 y 500 caracteres.",
        "photos": "Agrega entre 1 y 3 direcciones HTTPS válidas para las fotos.",
        "opening_hour": "La apertura debe ser una hora entera entre 0 y 23.",
        "closing_hour": (
            "El cierre debe ser una hora entera posterior a la apertura, hasta las 23."
        ),
    }
    missing_messages = {
        "name": "Ingresa el nombre del espacio.",
        "description": "Ingresa una descripción del espacio.",
        "category": "Selecciona la categoría del espacio.",
        "commune": "Ingresa la comuna del espacio.",
        "location_reference": "Ingresa una referencia de ubicación.",
        "capacity": "Ingresa la capacidad del espacio.",
        "price_per_hour": "Ingresa el precio por hora.",
        "conditions": "Ingresa las condiciones de uso.",
        "photos": "Agrega al menos una dirección HTTPS para las fotos.",
    }
    errors: dict[str, str] = {}
    for failure in error.errors():
        if failure["type"] == "extra_forbidden":
            errors["form"] = "La publicación solo acepta los campos del espacio."
            continue
        location = failure.get("loc", ())
        field = location[1] if len(location) >= 2 and location[0] == "body" else None
        if field not in invalid_messages:
            errors.setdefault("form", "Revisa los datos del formulario.")
        elif failure["type"] in {"text_encoding", "text_null_byte"}:
            errors.setdefault(field, "El campo contiene caracteres no válidos.")
        elif failure["type"] == "missing":
            errors.setdefault(field, missing_messages.get(field, invalid_messages[field]))
        else:
            errors.setdefault(field, invalid_messages[field])
    return JSONResponse(
        status_code=422,
        content={"detail": "Revisa los datos del formulario.", "errors": errors},
    )


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
    if request.method == "POST" and request.url.path.rstrip("/") == "/api/spaces":
        return space_validation_response(error)
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
