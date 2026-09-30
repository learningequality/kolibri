# /// script
# requires-python = ">=3.11"
# dependencies = ["packaging", "tomlkit"]
# ///
import argparse
import os

import tomlkit
from packaging.requirements import Requirement
from packaging.utils import canonicalize_name

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PYPROJECT = os.path.join(ROOT, "pyproject.toml")
CEXT_REQUIREMENTS = os.path.join(ROOT, "requirements", "cext.txt")


def _load(pyproject):
    with open(pyproject) as f:
        return tomlkit.parse(f.read())


def _cext_requirements(cext_requirements_path):
    requirements = {}
    with open(cext_requirements_path) as f:
        for line in f:
            line = line.partition("#")[0].strip()
            if line:
                requirement = Requirement(line)
                requirements[canonicalize_name(requirement.name)] = requirement
    return requirements


def runtime_requirements(pyproject=PYPROJECT, cext_requirements_path=CEXT_REQUIREMENTS):
    cexts = _cext_requirements(cext_requirements_path)
    for requirement in _load(pyproject)["project"]["dependencies"]:
        cext = cexts.get(canonicalize_name(Requirement(requirement).name))
        if cext is None:
            yield requirement
            continue
        pinned = [spec.version for spec in cext.specifier if spec.operator == "=="]
        if pinned and not Requirement(requirement).specifier.contains(pinned[0]):
            raise SystemExit(
                f"{cext.name} is pinned to {pinned[0]} in {cext_requirements_path}, "
                f"which does not satisfy '{requirement}' in {pyproject}"
            )


def clear_dependencies(pyproject):
    doc = _load(pyproject)
    doc["project"]["dependencies"] = []
    with open(pyproject, "w") as f:
        f.write(tomlkit.dumps(doc))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Read or strip [project] dependencies for the static build"
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--requirements",
        action="store_true",
        help="print runtime dependencies, excluding requirements/cext.txt packages",
    )
    group.add_argument(
        "--clear",
        metavar="PYPROJECT",
        help="empty [project] dependencies in the given pyproject.toml",
    )
    args = parser.parse_args()
    if args.requirements:
        for requirement in runtime_requirements():
            print(requirement)  # noqa: T201
    else:
        clear_dependencies(args.clear)
