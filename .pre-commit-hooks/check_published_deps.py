#!/usr/bin/env python3
"""
Check that no published npm package under packages/ needs a private one.

`scripts/npm_publish.sh` skips every package whose `private` is truthy, and pnpm
links the workspace copy locally, so the break only shows for consumers. Checks
runtime dependency fields and imports in shipped (non-test) source.
"""

import glob
import json
import logging
import os
import re
import sys

RUNTIME_DEPENDENCY_FIELDS = (
    "dependencies",
    "peerDependencies",
    "optionalDependencies",
)

SOURCE_SUFFIXES = (".js", ".vue")

EXCLUDED_SOURCE_DIRS = ("node_modules", "dist", "__tests__", "__fixtures__")

EXCLUDED_SOURCE_SUFFIXES = (".spec.js", ".test.js")

# `from 'x'`, `require('x')`, `import('x')`, bare `import 'x'` and `@import 'x'`,
# the last of which a component's <style> block uses as often as its script does.
SPECIFIER = re.compile(
    r"""(?:\bfrom\s*|\brequire\s*\(\s*|\bimport\s*\(\s*|\bimport\s+(?:url\(\s*)?"""
    r"""|<style[^>]*\bsrc\s*=\s*)(['"])([^'"]+)\1"""
)


def manifests():
    """Every package.json under packages/, keyed by its path."""
    result = {}
    for path in sorted(glob.glob(os.path.join("packages", "*", "package.json"))):
        with open(path) as handle:
            result[path] = json.load(handle)
    return result


def source_files(package_dir):
    for root, dirs, files in os.walk(package_dir):
        dirs[:] = [d for d in dirs if d not in EXCLUDED_SOURCE_DIRS]
        for name in sorted(files):
            if name.endswith(SOURCE_SUFFIXES) and not name.endswith(
                EXCLUDED_SOURCE_SUFFIXES
            ):
                yield os.path.join(root, name)


def failures(packages):
    private = {m["name"] for m in packages.values() if m.get("private")}
    for path, manifest in packages.items():
        if manifest.get("private"):
            continue
        for field in RUNTIME_DEPENDENCY_FIELDS:
            for name in sorted(manifest.get(field) or {}):
                if name in private:
                    yield path, f"lists '{name}' under {field}", name
        for source in source_files(os.path.dirname(path)):
            with open(source) as handle:
                specifiers = {s for _, s in SPECIFIER.findall(handle.read())}
            for specifier in sorted(specifiers):
                # webpack's `~` prefix, which the stylesheet imports use to reach a package.
                segments = specifier.lstrip("~").split("/")
                name = "/".join(
                    segments[:2] if segments[0].startswith("@") else segments[:1]
                )
                if name in private:
                    yield source, f"imports '{specifier}'", name


def main():
    logging.basicConfig(level=logging.ERROR, format="%(message)s", stream=sys.stderr)
    logger = logging.getLogger(__name__)

    found = list(failures(manifests()))
    if not found:
        return 0

    logger.error("Published packages reach for packages that are never published:")
    for location, what, dependency in found:
        logger.error("")
        logger.error("  %s %s", location, what)
        logger.error("    %s is private, so npm_publish.sh skips it", dependency)
    logger.error("")
    logger.error("Drop 'private' from the dependency so it publishes too, or move what")
    logger.error("the published package needs somewhere that publishes with it.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
