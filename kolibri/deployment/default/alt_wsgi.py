"""
WSGI config for the alternate origin server used for serving
sandboxed content
"""
import os

from kolibri.core.content.utils import paths
from kolibri.core.content.zip_wsgi import get_application
from kolibri.utils.django_whitenoise import DjangoWhiteNoise

os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE", "kolibri.deployment.default.settings.base"
)


def generate_alt_wsgi_application():
    alt_content_path = "/" + paths.get_content_url(
        paths.zip_content_path_prefix()
    ).lstrip("/")

    content_dirs = [paths.get_content_dir_path()] + paths.get_content_fallback_paths()

    # Mount static files
    return DjangoWhiteNoise(
        get_application(),
        static_prefix=paths.zip_content_static_root(),
        dynamic_locations=[
            (alt_content_path, content_dir) for content_dir in content_dirs
        ],
    )


alt_application = generate_alt_wsgi_application()
