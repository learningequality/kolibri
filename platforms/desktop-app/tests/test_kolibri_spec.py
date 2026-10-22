import ast
import ntpath
import posixpath
import types
from pathlib import Path

import pytest

SPEC = Path(__file__).parent.parent / "kolibri.spec"


def locale_datas(path_module, mo_files):
    tree = ast.parse(SPEC.read_text(encoding="utf-8"))
    assignment = next(
        node
        for node in tree.body
        if isinstance(node, ast.Assign)
        and ast.unparse(node.targets[0]) == "locale_datas"
    )
    namespace = {
        "os": types.SimpleNamespace(path=path_module),
        "glob": lambda pattern: mo_files,
    }
    exec(compile(ast.Module([assignment], []), str(SPEC), "exec"), namespace)
    return namespace["locale_datas"]


# glob joins the parts its wildcards matched with the platform separator.
@pytest.mark.parametrize(
    "path_module,mo_file,dest",
    [
        (
            ntpath,
            "src/kolibri_app/locales\\es_419\\LC_MESSAGES\\wxapp.mo",
            "kolibri_app\\locales\\es_419\\LC_MESSAGES",
        ),
        (
            posixpath,
            "src/kolibri_app/locales/es_419/LC_MESSAGES/wxapp.mo",
            "kolibri_app/locales/es_419/LC_MESSAGES",
        ),
    ],
)
def test_catalogues_are_bundled_under_kolibri_app_locales(path_module, mo_file, dest):
    assert locale_datas(path_module, [mo_file]) == [(mo_file, dest)]
