#!/usr/bin/env python3
"""
Check that all GitHub workflow files have a top-level permissions block.
Used as a pre-commit hook and standalone verification tool.
"""
import logging
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    logging.basicConfig(level=logging.ERROR, format="%(message)s", stream=sys.stderr)
    logging.getLogger(__name__).error(
        "ERROR: PyYAML is required. Run: pip install pyyaml"
    )
    sys.exit(2)


def check_file(path):
    """Return None if file has a top-level permissions block, else an error string."""
    with open(path) as f:
        try:
            workflow = yaml.safe_load(f)
        except yaml.YAMLError as e:
            return "YAML parse error: {}".format(e)
    if not isinstance(workflow, dict):
        return "not a valid workflow YAML mapping"
    if "permissions" not in workflow:
        return "missing top-level permissions: block"
    return None


def main(filenames):
    logging.basicConfig(level=logging.ERROR, format="%(message)s", stream=sys.stderr)
    logger = logging.getLogger(__name__)

    failures = []
    for filepath in filenames:
        path = Path(filepath)
        # Only check workflow YAML files
        if path.suffix not in (".yml", ".yaml"):
            continue
        error = check_file(path)
        if error:
            failures.append("  {}: {}".format(filepath, error))
    if failures:
        logger.error("Workflow permissions check FAILED:")
        for f in failures:
            logger.error(f)
        logger.error(
            "\nAll workflow files must declare a top-level `permissions:` block."
        )
        logger.error("See .github/workflows/check_docs.yml for an example.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
