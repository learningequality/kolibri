"""Import the Windows-only kolibri_app modules with pywin32 stubbed out.

Shared by the Windows test modules: a module imported here keeps references to
these stubs, so a second, independent import would leave tests patching stubs
the code no longer uses.
"""

import ctypes
import importlib
import sys
from unittest.mock import MagicMock
from unittest.mock import patch

import kolibri_app.constants
import kolibri_app.view


class Win32Error(Exception):
    def __init__(self, winerror):
        super().__init__(winerror)
        self.winerror = winerror


class _App:
    """Stands in for wx.App, which must be a real class to subclass."""

    def SetAppName(self, name):
        pass


pywintypes = MagicMock()
pywintypes.error = Win32Error
win32service = MagicMock()
win32serviceutil = MagicMock()

_windows_modules = {
    "pywintypes": pywintypes,
    "win32service": win32service,
    "win32serviceutil": win32serviceutil,
    "win32gui": MagicMock(),
    "ntsecuritycon": MagicMock(),
    "win32api": MagicMock(),
    "win32con": MagicMock(),
    "win32file": MagicMock(),
    "win32job": MagicMock(),
    "win32pipe": MagicMock(),
    "winerror": MagicMock(),
    "kolibri_app.windows_registry": MagicMock(),
    "kolibri_app.server_process_windows": MagicMock(),
}

_stubbed_imports = (
    "kolibri_app.server_manager_windows",
    "kolibri_app.windows.taskbar_icon",
    "kolibri_app.windows_utils",
    "kolibri_app.windows.stop_window",
    "kolibri_app.application",
)

wx = sys.modules["wx"]

_imported_before = {name: sys.modules.pop(name, None) for name in _stubbed_imports}
sys.modules.update(_windows_modules)
try:
    with (
        patch.object(ctypes, "windll", MagicMock(), create=True),
        patch.object(kolibri_app.constants, "WINDOWS", True),
        patch.object(wx, "App", _App),
    ):
        server_manager_windows = importlib.import_module(
            "kolibri_app.server_manager_windows"
        )
        taskbar_icon = importlib.import_module("kolibri_app.windows.taskbar_icon")
        windows_utils = importlib.import_module("kolibri_app.windows_utils")
        stop_window = importlib.import_module("kolibri_app.windows.stop_window")
        application = importlib.import_module("kolibri_app.application")
finally:
    for _name in _windows_modules:
        del sys.modules[_name]
    for _name, _module in _imported_before.items():
        _parent_name, _, _child = _name.rpartition(".")
        _parent = sys.modules[_parent_name]
        if _module is None:
            sys.modules.pop(_name, None)
            if hasattr(_parent, _child):
                delattr(_parent, _child)
        else:
            sys.modules[_name] = _module
            setattr(_parent, _child, _module)
