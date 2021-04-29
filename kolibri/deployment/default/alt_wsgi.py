"""
WSGI config for the alternate origin server used for serving
sandboxed content
"""
import os

import kolibri.core.content
from kolibri.core.content.utils import paths
from kolibri.core.content.zip_wsgi import get_application
from kolibri.utils.kolibri_whitenoise import DynamicWhiteNoise

os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE", "kolibri.deployment.default.settings.base"
)


def generate_alt_wsgi_application():
    alt_content_path = "/" + paths.get_content_url(
        paths.zip_content_path_prefix()
    ).lstrip("/")

    content_dirs = [paths.get_content_dir_path()] + paths.get_content_fallback_paths()

    content_static_path = os.path.join(
        os.path.dirname(kolibri.core.content.__file__), "static"
    )

    # Mount static files
    return DynamicWhiteNoise(
        get_application(),
        dynamic_locations=[
            (alt_content_path, content_dir) for content_dir in content_dirs
        ]
        + [(paths.zip_content_static_root(), content_static_path)],
    )


alt_application = generate_alt_wsgi_application()
