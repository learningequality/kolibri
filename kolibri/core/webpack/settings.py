from __future__ import absolute_import, print_function, unicode_literals

import re


IGNORE_PATTERNS = (re.compile(I) for I in [r'.+\.hot-update.js', r'.+\.map'])
