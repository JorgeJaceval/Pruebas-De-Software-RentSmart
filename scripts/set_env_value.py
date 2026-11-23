"""Escribe una variable en shared/.env del servidor leyendo su valor por stdin.

El valor nunca pasa por la línea de comandos ni se imprime. Solo acepta archivos con permisos 600,
nombres de variable simples y valores sin espacios, comillas ni saltos de línea.

Uso: printf '%s' "$VALOR" | python3 set_env_value.py /opt/rentsmart/shared/.env NOMBRE
"""
import os
import re
import stat
import sys
import tempfile

NAME = re.compile(r"^[A-Z][A-Z0-9_]{0,63}$")
VALUE = re.compile(r"^[A-Za-z0-9._-]{1,512}$")


def set_value(path, name, value):
    if not NAME.fullmatch(name):
        raise ValueError("Nombre de variable inválido")
    if not VALUE.fullmatch(value):
        raise ValueError("Valor inválido")
    if stat.S_IMODE(os.stat(path).st_mode) != 0o600:
        raise ValueError("El archivo de variables debe tener permisos 600")
    with open(path, encoding="utf-8") as source:
        lines = source.read().splitlines()
    prefix = f"{name}="
    entry = prefix + value
    found = [index for index, line in enumerate(lines) if line.startswith(prefix)]
    if found and all(lines[index] == entry for index in found):
        return "sin cambios"
    lines = [line for line in lines if not line.startswith(prefix)] + [entry]
    directory = os.path.dirname(os.path.abspath(path))
    descriptor, temporary = tempfile.mkstemp(dir=directory, prefix=".env.")
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as output:
            output.write("\n".join(lines) + "\n")
        os.chmod(temporary, 0o600)
        os.replace(temporary, path)
    except BaseException:
        os.unlink(temporary)
        raise
    return "actualizada"


def main():
    if len(sys.argv) != 3:
        print("Uso: set_env_value.py ARCHIVO NOMBRE (valor por stdin)", file=sys.stderr)
        return 2
    path, name = sys.argv[1], sys.argv[2]
    value = sys.stdin.read().strip()
    try:
        result = set_value(path, name, value)
    except (OSError, ValueError) as error:
        print(f"{name}: no se escribió ({error})", file=sys.stderr)
        return 1
    print(f"{name}: {result} en {os.path.basename(path)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
