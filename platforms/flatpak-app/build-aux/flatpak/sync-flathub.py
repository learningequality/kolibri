#!/usr/bin/env python3
"""Copy this repo's canonical production Flatpak files into a flathub-repo
checkout and pin the kolibri-gnome module to a given ref.

Run *after* prepare-kolibri-module.py --pin has rendered the production
python3-kolibri.json. Usage: sync-flathub.py <flathub-checkout-dir> <ref>
"""
import json
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent  # build-aux/flatpak
MANIFEST = "org.learningequality.Kolibri.json"


def pin_kolibri_gnome(data: dict, ref: str, commit: str) -> None:
    """Point the kolibri-gnome module's git source at ref/commit.

    A stale Flathub build reported green is worse than a failed release, so this
    raises rather than no-op if the module or its git source has moved: matching
    by name and by source type == "git" (not sources[0]) survives a reordered or
    renamed source, and erroring on no match survives a renamed module.
    """
    for module in data["modules"]:
        if not (isinstance(module, dict) and module.get("name") == "kolibri-gnome"):
            continue
        git_sources = [s for s in module.get("sources", []) if s.get("type") == "git"]
        if not git_sources:
            raise SystemExit("kolibri-gnome module has no git source to pin")
        for source in git_sources:
            source["tag"], source["commit"] = ref, commit
        return
    raise SystemExit("No kolibri-gnome module found in manifest; cannot pin ref")


def main(flathub_dir: str, ref: str) -> None:
    dest = Path(flathub_dir)
    # Resolve against this repo, not the process CWD: the ref names a
    # kolibri-gnome commit, and running from the flathub checkout would
    # otherwise silently pin a commit from the wrong repository.
    commit = subprocess.check_output(
        ["git", "rev-parse", ref], text=True, cwd=HERE
    ).strip()

    # Replace any prior manifest (the flathub repo currently ships .yaml).
    for stale in dest.glob("org.learningequality.Kolibri.*"):
        if stale.suffix in (".json", ".yaml", ".yml"):
            stale.unlink()
    shutil.copy2(HERE / MANIFEST, dest / MANIFEST)

    for sub in ("modules", "tools"):
        target = dest / sub
        if target.exists():
            shutil.rmtree(target)
        shutil.copytree(HERE / sub, target)
    shutil.copy2(HERE.parents[1] / "flathub.json", dest / "flathub.json")

    manifest_path = dest / MANIFEST
    data = json.loads(manifest_path.read_text())
    pin_kolibri_gnome(data, ref, commit)
    manifest_path.write_text(json.dumps(data, indent=4) + "\n")
    print(
        f"Synced production manifest into {dest} (kolibri-gnome @ {ref} {commit[:9]})"
    )


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("usage: sync-flathub.py <flathub-dir> <ref>")
    main(sys.argv[1], sys.argv[2])
