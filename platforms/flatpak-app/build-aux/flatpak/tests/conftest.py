# The vendored plugin imports a small Kolibri surface at module load; rather
# than install all of Kolibri, we stub just those symbols so the real
# launcher-diffing and Pillow icon-rendering code runs against a temp content
# dir and a fake channel. pytest loads this before collecting the test modules.
import functools
import sys
import types
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_ROOT / "src"))


def _stub_module(name):
    module = types.ModuleType(name)
    sys.modules[name] = module
    return module


# Only the symbols channel_launchers/path_utils reference at import time are
# provided; the DB query surface (ChannelMetadata.objects) is set per-test.
for _pkg in (
    "kolibri",
    "kolibri.core",
    "kolibri.core.content",
    "kolibri.core.content.utils",
    "kolibri.dist",
    "kolibri.dist.django",
    "kolibri.dist.django.utils",
):
    _stub_module(_pkg)
_stub_module("kolibri.core.content.models").ChannelMetadata = type(
    "ChannelMetadata", (), {}
)
_stub_module("kolibri.core.content.utils.paths").get_content_dir_path = lambda: (
    "/nonexistent"
)
_stub_module(
    "kolibri.dist.django.utils.functional"
).cached_property = functools.cached_property
