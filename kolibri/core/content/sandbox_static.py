import os

from importlib_resources import files

from kolibri.core.content.hooks import SandboxedContentViewerHook
from kolibri.core.kolibri_plugin import FrontEndPolyfillAssetHook


def get_sandbox_static_locations():
    """
    Returns ``(prefix, fs_path)`` pairs for the static directories mounted on the
    sandbox server, ``prefix`` relative to its static root.

    The first location holding a path wins, so a plugin must namespace its own
    subdirectory (core is mounted first and cannot be shadowed).
    """
    polyfills_id = FrontEndPolyfillAssetHook().unique_id
    return [
        ("", str(files("kolibri.core.content").joinpath("static"))),
        (
            f"{polyfills_id}/",
            str(files("kolibri.core").joinpath("static").joinpath(polyfills_id)),
        ),
        *(
            ("", hook.sandbox_static_path)
            for hook in SandboxedContentViewerHook.registered_hooks
        ),
    ]


def get_sandbox_handler_output_dirs():
    return [
        os.path.join(hook.sandbox_static_path, hook.sandbox_handler_unique_id)
        for hook in SandboxedContentViewerHook.registered_hooks
    ]
