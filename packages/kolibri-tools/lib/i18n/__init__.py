import sys

if sys.version_info[0] < 3:
    raise RuntimeError("Python 2 is not supported")
elif sys.version_info[0] == 3 and sys.version_info[1] < 8:
    raise RuntimeError("Python 3.8 or higher is required")
