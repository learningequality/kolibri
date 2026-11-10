import ast
from pathlib import Path

import django_vectors

PACKAGE_DIR = Path(django_vectors.__file__).parent
TEST_DIR = Path(__file__).parent


def _kolibri_imports(source):
    names = []
    for node in ast.walk(ast.parse(source)):
        if isinstance(node, ast.Import):
            modules = [alias.name for alias in node.names]
        elif isinstance(node, ast.ImportFrom) and node.level == 0:
            modules = [node.module]
        else:
            continue
        names.extend(m for m in modules if m.split(".")[0] == "kolibri")
    return names


def test_scanner_detects_kolibri_imports():
    source = (
        "import kolibri.core\nfrom kolibri.utils import conf\nimport kolibri_extra\n"
    )
    assert _kolibri_imports(source) == ["kolibri.core", "kolibri.utils"]


def test_django_vectors_has_no_kolibri_import():
    offenders = {}
    for root in (PACKAGE_DIR, TEST_DIR):
        for path in sorted(root.rglob("*.py")):
            names = _kolibri_imports(path.read_text(encoding="utf-8"))
            if names:
                offenders[str(path.relative_to(root.parent))] = names
    assert offenders == {}
