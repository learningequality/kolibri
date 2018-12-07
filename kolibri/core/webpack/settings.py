from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import re


IGNORE_PATTERNS = (re.compile(I) for I in [r'.+\.hot-update.js', r'.+\.map'])
