import importlib.util
import json
import os

import pytest

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

HOOK_PATH = os.path.join(REPO_ROOT, ".pre-commit-hooks", "check_published_deps.py")


@pytest.fixture
def hook():
    spec = importlib.util.spec_from_file_location("check_published_deps", HOOK_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture
def workspace(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    return tmp_path


def write_package(root, dirname, manifest, sources=None):
    package_dir = root / "packages" / dirname
    package_dir.mkdir(parents=True)
    (package_dir / "package.json").write_text(json.dumps(manifest))
    for relative, contents in (sources or {}).items():
        path = package_dir / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(contents)


def write_private(root, name="private-pkg"):
    write_package(root, name.replace("/", "-"), {"name": name, "private": True})


@pytest.mark.parametrize("field", ["dependencies", "peerDependencies"])
def test_fails_on_a_runtime_dependency_on_a_private_package(hook, workspace, field):
    write_private(workspace)
    write_package(
        workspace, "public", {"name": "public", field: {"private-pkg": "workspace:*"}}
    )

    assert hook.main() == 1


@pytest.mark.parametrize(
    "private_name,filename,source",
    [
        ("private-pkg", "index.js", "import thing from 'private-pkg';\n"),
        ("private-pkg", "index.js", "const thing = require('private-pkg/sub');\n"),
        ("@scope/private", "index.js", "import thing from '@scope/private/sub';\n"),
        (
            "private-pkg",
            "Component.vue",
            "<style lang='scss'>\n@import '~private-pkg/styles';\n</style>\n",
        ),
    ],
    ids=["from", "require", "scoped", "tilde"],
)
def test_fails_on_an_import_of_a_private_package(
    hook, workspace, private_name, filename, source
):
    write_private(workspace, private_name)
    write_package(workspace, "public", {"name": "public"}, {f"src/{filename}": source})

    assert hook.main() == 1


def test_passes_when_published_packages_need_only_published_ones(hook, workspace):
    write_private(workspace)
    write_package(workspace, "other", {"name": "other"})
    write_package(
        workspace,
        "public",
        {"name": "public", "dependencies": {"other": "workspace:*"}},
        {"src/index.js": "import other from 'other';\nimport local from './local';\n"},
    )

    assert hook.main() == 0


def test_ignores_tests_and_node_modules(hook, workspace):
    write_private(workspace)
    write_package(
        workspace,
        "public",
        {"name": "public"},
        {
            "src/index.spec.js": "import thing from 'private-pkg';\n",
            "node_modules/dep/index.js": "require('private-pkg');\n",
        },
    )

    assert hook.main() == 0


def test_ignores_what_private_packages_need(hook, workspace):
    write_private(workspace)
    write_package(
        workspace,
        "private-consumer",
        {
            "name": "private-consumer",
            "private": True,
            "dependencies": {"private-pkg": "workspace:*"},
        },
        {"src/index.js": "import thing from 'private-pkg';\n"},
    )

    assert hook.main() == 0
