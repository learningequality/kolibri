"""
WSGI config for the alternate origin server used for serving
sandboxed content
"""

import os

import django

from kolibri.core.content.utils import paths

os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE", "kolibri.deployment.default.settings.base"
)


def generate_alt_wsgi_application():
    django.setup(set_prefix=False)

    # Defer these imports until after django setup has run, as they depend
    # on Django models (via the NetworkClient) or the plugin registry
    from kolibri.core.content.hooks import SandboxedContentViewerHook
    from kolibri.core.content.zip_wsgi import get_application
    from kolibri.utils.kolibri_whitenoise import DynamicWhiteNoise

    alt_content_path = "/" + paths.get_content_url(
        paths.zip_content_path_prefix()
    ).lstrip("/")

    content_dirs = [paths.get_content_dir_path()] + paths.get_content_fallback_paths()

    static_root = paths.zip_content_static_root()

    # Mount all sandbox static directories at the same root
    static_locations = [
        (static_root, fs_path)
        for fs_path in SandboxedContentViewerHook.get_sandbox_static_paths()
    ]

    # Mount static files
    return DynamicWhiteNoise(
        get_application(),
        dynamic_locations=[
            (alt_content_path, content_dir) for content_dir in content_dirs
        ]
        + static_locations,
        app_paths=[paths.get_zip_content_base_path()],
    )


alt_application = generate_alt_wsgi_application()
