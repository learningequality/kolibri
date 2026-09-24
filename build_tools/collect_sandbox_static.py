"""
Collect the static files the sandbox server serves into one directory, for upload to
object storage. Run from the project environment, after the frontend is built:

    uv run python build_tools/collect_sandbox_static.py <destination>
"""

import argparse
import gzip
import os
import shutil
import sys
import tempfile

GZ = ".gz"
FILE_SIZE = ".file_size"


def sandbox_sources():
    """
    The directories alt_wsgi.py mounts on the sandbox server, in resolution order, and
    the built output directory of every sandbox handler bundle.
    """
    # kolibri.utils.conf reads KOLIBRI_HOME at import, so the caller sets it first.
    from kolibri.core.content.hooks import SandboxedContentViewerHook
    from kolibri.plugins.registry import registered_plugins

    list(registered_plugins)
    handler_outputs = [
        os.path.join(hook.sandbox_static_path, hook.sandbox_handler_unique_id)
        for hook in SandboxedContentViewerHook.registered_hooks
    ]
    return SandboxedContentViewerHook.get_sandbox_static_paths(), handler_outputs


def _is_serve_artifact(path):
    # DynamicWhiteNoise serves a .gz as content-encoding on its primary's URL, so a
    # static host has no URL for it; a .gz with no primary is a content file.
    if path.endswith(FILE_SIZE):
        return True
    return path.endswith(GZ) and os.path.exists(path[: -len(GZ)])


def _collect_file(src, dest):
    # compress.js truncates each file to 0 bytes beside its .gz and .file_size;
    # DynamicWhiteNoise rebuilds it at serve time, a CDN won't.
    compressed = (
        os.path.exists(src + FILE_SIZE)
        and os.path.getsize(src) == 0
        and os.path.exists(src + GZ)
    )
    if compressed:
        with gzip.open(src + GZ, "rb") as f_in, open(dest, "wb") as f_out:
            shutil.copyfileobj(f_in, f_out)
    else:
        shutil.copyfile(src, dest)


def _assert_built(source_dirs, handler_outputs):
    for source_dir in source_dirs:
        if not os.path.isdir(source_dir):
            raise RuntimeError(
                f"Static directory not found, build it first: {source_dir}"
            )
    for output in handler_outputs:
        if not os.path.isdir(output) or not os.listdir(output):
            raise RuntimeError(
                f"Sandbox handler bundle not built, build it first: {output}"
            )


def _content_files(source_dir):
    for root, _, filenames in os.walk(source_dir):
        for filename in filenames:
            src = os.path.join(root, filename)
            if not _is_serve_artifact(src):
                yield src


def collect(source_dirs, handler_outputs, destination):
    _assert_built(source_dirs, handler_outputs)

    collected = {}
    for source_dir in source_dirs:
        for src in _content_files(source_dir):
            rel = os.path.relpath(src, source_dir)
            if rel in collected:
                raise RuntimeError(
                    f"{rel} is in both {collected[rel]} and {source_dir}; "
                    "a sandbox handler plugin must namespace its static files"
                )
            collected[rel] = source_dir
            dest = os.path.join(destination, rel)
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            _collect_file(src, dest)

    if not collected:
        raise RuntimeError("No static files found to collect")
    return len(collected)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("destination")
    args = parser.parse_args()
    with tempfile.TemporaryDirectory() as home:
        # A fresh home enables exactly the default plugins.
        os.environ["KOLIBRI_HOME"] = home
        source_dirs, handler_outputs = sandbox_sources()
        count = collect(source_dirs, handler_outputs, args.destination)
    sys.stdout.write(f"Collected {count} files to {args.destination}\n")


if __name__ == "__main__":
    main()
