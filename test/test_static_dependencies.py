import pytest

from build_tools.static_dependencies import clear_dependencies
from build_tools.static_dependencies import runtime_requirements

PYPROJECT = """\
[project]
name = "kolibri"
# the dependencies
dependencies = [
    "django==3.2.25",
    "Cryptography>=40.0.2; platform_machine != 'armv7l'",
]

[project.optional-dependencies]
crypto = ["cryptography>=40.0.2"]
"""


@pytest.fixture
def pyproject(tmp_path):
    path = tmp_path / "pyproject.toml"
    path.write_text(PYPROJECT)
    return str(path)


def _cext_requirements(tmp_path, content):
    path = tmp_path / "cext.txt"
    path.write_text(content)
    return str(path)


def test_runtime_requirements_exclude_cext_packages(tmp_path, pyproject):
    cext = _cext_requirements(tmp_path, "# vendored per-arch\ncryptography==40.0.2\n")
    assert list(runtime_requirements(pyproject, cext)) == ["django==3.2.25"]


def test_runtime_requirements_reject_cext_pin_outside_declared_range(
    tmp_path, pyproject
):
    cext = _cext_requirements(tmp_path, "cryptography==39.0.0\n")
    with pytest.raises(SystemExit, match=r"cryptography is pinned to 39\.0\.0"):
        list(runtime_requirements(pyproject, cext))


def test_clear_dependencies_empties_only_project_dependencies(tmp_path, pyproject):
    clear_dependencies(pyproject)
    cext = _cext_requirements(tmp_path, "")
    assert list(runtime_requirements(pyproject, cext)) == []
    with open(pyproject) as f:
        cleared = f.read()
    assert cleared == PYPROJECT.replace(
        """dependencies = [
    "django==3.2.25",
    "Cryptography>=40.0.2; platform_machine != 'armv7l'",
]""",
        "dependencies = []",
    )
