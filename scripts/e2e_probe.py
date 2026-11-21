"""Identifica la aserción artificial real; un error de preparación no la acredita."""

import json
import os
from pathlib import Path
import sys
import xml.etree.ElementTree as ET


PROBE_NAME = "CI-PROBE: fallo artificial E2E ejecutado"
EXPECTED_HEADING = "REN90_EXPECTED_DIFFERENT_HEADING"


def was_executed(directory):
    try:
        directory = Path(directory)
        marker = json.loads((directory / "probe-executed.json").read_text())
        if not isinstance(marker, dict) or marker.get("probe") != "REN-90":
            return False
        if marker.get("expected") != EXPECTED_HEADING or marker.get("actual") != "Explorar catálogo":
            return False
        root = ET.parse(directory / "junit.xml").getroot()
        if any(root.get(key) != value for key, value in
               (("tests", "1"), ("failures", "1"), ("errors", "0"), ("skipped", "0"))):
            return False
        cases = list(root.iter("testcase"))
        if len(cases) != 1 or cases[0].get("name") != PROBE_NAME:
            return False
        failure = cases[0].find("failure")
        message = "" if failure is None else "".join(failure.itertext())
        return EXPECTED_HEADING in message and "toHaveText" in message
    except (OSError, ValueError, ET.ParseError):
        return False


def main():
    executed = was_executed(sys.argv[1])
    output = os.environ.get("GITHUB_OUTPUT")
    if output:
        with Path(output).open("a", encoding="utf-8") as destination:
            destination.write(f"probe_executed={'true' if executed else 'false'}\n")
    print("Sonda E2E: aserción artificial fallida verificada." if executed else
          "Sonda E2E: no se verificó la aserción artificial; revisar preparación y reportes.")


if __name__ == "__main__":
    main()
