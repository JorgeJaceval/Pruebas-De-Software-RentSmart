"""Contratos de evidencia: falla de aserción real frente a preparación/otro error."""

import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import e2e_probe


class ProbeEvidence(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="rentsmart-probe-")
        self.addCleanup(temporary.cleanup)
        self.directory = Path(temporary.name)
        self.marker = self.directory / "probe-executed.json"
        self.marker.write_text(json.dumps({"probe": "REN-90", "expected": e2e_probe.EXPECTED_HEADING,
                                           "actual": "Explorar catálogo"}))
        self.report = self.directory / "junit.xml"
        self.write_report()

    def write_report(self, failure=True, message=None):
        root = ET.Element("testsuites", tests="1", failures="1" if failure else "0", errors="0", skipped="0")
        case = ET.SubElement(ET.SubElement(root, "testsuite"), "testcase", name=e2e_probe.PROBE_NAME)
        if failure:
            ET.SubElement(case, "failure").text = message or f"expect(locator).toHaveText: expected {e2e_probe.EXPECTED_HEADING}"
        ET.ElementTree(root).write(self.report, encoding="unicode")

    def test_intentional_locator_failure_is_identified(self):
        self.assertTrue(e2e_probe.was_executed(self.directory))

    def test_preparation_failure_without_marker_is_not_probe(self):
        self.marker.unlink()
        self.write_report(message="browserType.launch: executable missing")
        self.assertFalse(e2e_probe.was_executed(self.directory))

    def test_other_failure_with_marker_is_not_verified_assertion(self):
        self.write_report(message="Network unavailable")
        self.assertFalse(e2e_probe.was_executed(self.directory))

    def test_passing_case_does_not_claim_artificial_failure(self):
        self.write_report(failure=False)
        self.assertFalse(e2e_probe.was_executed(self.directory))

    def test_invalid_marker_or_report_is_not_verified(self):
        for value in ("[]", "{}", "not-json"):
            with self.subTest(value=value):
                self.marker.write_text(value)
                self.assertFalse(e2e_probe.was_executed(self.directory))
        self.marker.write_text(json.dumps({"probe": "REN-90", "expected": e2e_probe.EXPECTED_HEADING,
                                           "actual": "Explorar catálogo"}))
        self.report.write_text("invalid-xml")
        self.assertFalse(e2e_probe.was_executed(self.directory))

    def test_command_exports_only_verified_flag(self):
        output = self.directory / "github-output"
        result = subprocess.run([sys.executable, str(Path(e2e_probe.__file__)), str(self.directory)],
                                env={**os.environ, "GITHUB_OUTPUT": str(output)},
                                capture_output=True, text=True, timeout=10)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(output.read_text(), "probe_executed=true\n")
        self.assertIn("verificada", result.stdout)


if __name__ == "__main__":
    unittest.main()
