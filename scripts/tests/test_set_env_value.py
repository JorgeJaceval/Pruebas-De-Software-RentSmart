"""Escritura de una variable en shared/.env sin exponer su valor."""

import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


SCRIPT = Path(__file__).resolve().parents[1] / "set_env_value.py"
VALUE = "AQ.valor-ficticio_de.prueba-123"


class SetEnvValue(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="rentsmart-env-")
        self.addCleanup(self.temporary.cleanup)
        self.env = Path(self.temporary.name) / ".env"
        self.env.write_text("SITE_ADDRESS=example.org\nGEMINI_API_KEY=\nOTRA=1\n")
        self.env.chmod(0o600)

    def run_script(self, value, name="GEMINI_API_KEY"):
        return subprocess.run([sys.executable, str(SCRIPT), str(self.env), name],
                              input=value, capture_output=True, text=True, timeout=10)

    def test_replaces_existing_value_keeps_others_and_permissions(self):
        result = self.run_script(VALUE)
        self.assertEqual(result.returncode, 0, result.stderr)
        lines = self.env.read_text().splitlines()
        self.assertEqual(lines.count(f"GEMINI_API_KEY={VALUE}"), 1)
        self.assertNotIn("GEMINI_API_KEY=", [line for line in lines if line != f"GEMINI_API_KEY={VALUE}"])
        self.assertIn("SITE_ADDRESS=example.org", lines)
        self.assertIn("OTRA=1", lines)
        self.assertEqual(os.stat(self.env).st_mode & 0o777, 0o600)

    def test_appends_when_missing_and_is_idempotent(self):
        self.env.write_text("SITE_ADDRESS=example.org\n")
        self.env.chmod(0o600)
        self.assertEqual(self.run_script(VALUE).returncode, 0)
        second = self.run_script(VALUE)
        self.assertIn("sin cambios", second.stdout)
        self.assertEqual(self.env.read_text().count("GEMINI_API_KEY="), 1)

    def test_never_prints_the_value(self):
        result = self.run_script(VALUE)
        self.assertNotIn(VALUE, result.stdout + result.stderr)

    def test_rejects_values_that_could_inject_variables(self):
        original = self.env.read_text()
        for bad in ("a b", "x\nSITE_ADDRESS=evil.org", "a'b", "a$b", ""):
            result = self.run_script(bad)
            self.assertNotEqual(result.returncode, 0, bad)
        self.assertEqual(self.env.read_text(), original)

    def test_rejects_readable_env_file(self):
        self.env.chmod(0o644)
        result = self.run_script(VALUE)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("600", result.stderr)

    def test_rejects_invalid_variable_name(self):
        self.assertNotEqual(self.run_script(VALUE, name="bad name").returncode, 0)


if __name__ == "__main__":
    unittest.main()
