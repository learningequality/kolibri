"""Make the debian package root importable when pytest runs from elsewhere."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
