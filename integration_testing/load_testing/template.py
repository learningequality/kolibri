import gzip
import hashlib
import os
import shutil
import subprocess
import sys
import tarfile

import click
from executors import LocalExecutor
from logger import info
from logger import success
from targets import file_sha
from targets import worktree_identity

THIS_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATES_DIR = os.path.join(THIS_DIR, "generated", "templates")
LOADTEST = os.path.join(THIS_DIR, "loadtest.py")
PRUNE_DIRS = ("process_cache", "logs", "sessions")
PRUNE_FILES = ("server.pid", "kolibri.pid")


def template_key(baseline_id, users, channel_id):
    return hashlib.sha256(f"{baseline_id}:{users}:{channel_id}".encode()).hexdigest()[
        :12
    ]


def baseline_identity(target):
    if target.is_dev:
        return worktree_identity(target.source)
    return target.wheel_sha, False


def prune_home(home):
    for directory in PRUNE_DIRS:
        shutil.rmtree(os.path.join(home, directory), ignore_errors=True)
    for filename in PRUNE_FILES:
        path = os.path.join(home, filename)
        if os.path.exists(path):
            os.remove(path)


def _zero_mtime(tarinfo):
    tarinfo.mtime = 0
    return tarinfo


def pack_template(template_dir, tarball_path):
    # gzip headers embed an mtime and the filename; pin both so identical
    # content hashes identically.
    with open(tarball_path, "wb") as f:
        with gzip.GzipFile(filename="", fileobj=f, mode="wb", mtime=0) as gz:
            with tarfile.open(fileobj=gz, mode="w") as tar:
                for entry in sorted(os.listdir(template_dir)):
                    tar.add(
                        os.path.join(template_dir, entry),
                        arcname=entry,
                        filter=_zero_mtime,
                    )
    return file_sha(tarball_path)


def ensure_template(
    baseline, users, channel_id, username, password, port, regenerate=False
):
    identity, always_regenerate = baseline_identity(baseline)
    key = template_key(identity, users, channel_id)
    template_dir = os.path.join(TEMPLATES_DIR, key)
    tarball = template_dir + ".tar.gz"
    hash_file = template_dir + ".hash"
    if (
        os.path.isdir(template_dir)
        and os.path.exists(tarball)
        and os.path.exists(hash_file)
        and not regenerate
        and not always_regenerate
    ):
        with open(hash_file) as f:
            info(f"Reusing template {key}")
            return template_dir, tarball, f.read().strip()

    info(f"Generating template {key} from baseline '{baseline.name}'...")
    scratch = template_dir + ".scratch"
    shutil.rmtree(scratch, ignore_errors=True)
    os.makedirs(scratch)
    executor = LocalExecutor(port=port, run_home=scratch)
    try:
        executor.prepare(baseline)
        executor.start()
        result = subprocess.run(
            [
                sys.executable,
                LOADTEST,
                "--server",
                executor.server_url,
                "--username",
                username,
                "--password",
                password,
                "--users",
                str(users),
                "setup",
            ]
        )
        if result.returncode != 0:
            raise click.ClickException("loadtest.py setup failed")
    finally:
        executor.stop()
        executor.restore()
    prune_home(scratch)
    shutil.rmtree(template_dir, ignore_errors=True)
    os.rename(scratch, template_dir)
    content_hash = pack_template(template_dir, tarball)
    with open(hash_file, "w") as f:
        f.write(content_hash)
    success(f"Template {key} ready ({content_hash})")
    return template_dir, tarball, content_hash
