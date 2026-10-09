#!/usr/bin/env python3

import argparse
import json
import re
import secrets
from pathlib import Path


def slugify(value):
    slug = re.sub(r"[^a-z0-9]+", "-", value.strip().lower()).strip("-")
    return slug or "notebook"


def main():
    parser = argparse.ArgumentParser(description="Create a Jupyter experiment or tutorial notebook.")
    parser.add_argument("--kind", choices=("experiment", "tutorial"), default="experiment")
    parser.add_argument("--title", required=True)
    parser.add_argument("--out", type=Path)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    skill_dir = Path(__file__).resolve().parents[1]
    template = skill_dir / "assets" / f"{args.kind}-template.ipynb"
    output = args.out or Path(f"{slugify(args.title)}.ipynb")

    if output.exists() and not args.force:
        raise SystemExit(f"Refusing to overwrite existing notebook without --force: {output}")

    notebook = json.loads(template.read_text())
    notebook["cells"][0]["source"][0] = f"# {args.kind.title()}: {args.title}\n"
    for cell in notebook["cells"]:
        cell["id"] = secrets.token_hex(4)

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(notebook, indent=1, ensure_ascii=False) + "\n")
    print(f"Created {output} from the {args.kind} template")


if __name__ == "__main__":
    main()
