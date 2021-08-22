import sys

APP_NAME = "Kolibri"

LINUX = sys.platform.startswith('linux')

MAC = sys.platform.startswith('darwin')

WINDOWS = sys.platform.startswith('win32')

FROZEN = getattr(sys, 'frozen', False)
