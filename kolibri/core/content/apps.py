from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import mimetypes
import os

from django.apps import AppConfig


class KolibriContentConfig(AppConfig):
    name = "kolibri.core.content"
    label = "content"
    verbose_name = "Kolibri Content"

    def ready(self):
        from .signals import reorder_channels_upon_deletion  # noqa: F401
        from kolibri.core.content.utils.sqlalchemybridge import prepare_bases
        from .signals import cascade_delete_node  # noqa: F401

        # Do this to prevent import of broken Windows filetype registry that makes guesstype not work.
        # https://www.thecodingforums.com/threads/mimetypes-guess_type-broken-in-windows-on-py2-7-and-python-3-x.952693/
        mimetypes.init(
            [os.path.join(os.path.dirname(__file__), "constants", "mime.types")]
        )

        prepare_bases()
