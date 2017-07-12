# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function, unicode_literals

import os
import tempfile

import django.conf.locale

# If KOLIBRI_HOME isn't defined in the test env, it's okay to just set a
# temp directory for testing.
if 'KOLIBRI_HOME' not in os.environ:
    os.environ['KOLIBRI_HOME'] = tempfile.mkdtemp()


from .base import *  # noqa isort:skip @UnusedWildImport

LANGUAGES += [  # noqa
    ('rt-lft', 'ʜƨilǫnƎ'),
]

LANGUAGES_BIDI = ('rt',)

EXTRA_LANG_INFO = {
    'rt-lft': {
        'bidi': True,
        'code': 'rt-lft',
        'name': 'Mirror English',
        'name_local': 'ʜƨilǫnƎ',
    },
}

django.conf.locale.LANG_INFO.update(EXTRA_LANG_INFO)
