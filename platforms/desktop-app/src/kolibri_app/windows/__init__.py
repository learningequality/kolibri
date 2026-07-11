"""Windows-only components of the Kolibri app.

Modules in this package import ``pywin32``/Win32 APIs at import time and must
only be imported when running on Windows (guard with
``kolibri_app.constants.WINDOWS``).
"""
