"""
Graceful stop for the Kolibri Windows service.

Windows-only: imports pywin32 at import time.

NSSM stops the service by sending Ctrl+C to the process's console, then
WM_CLOSE to its top-level windows, waiting AppStopMethodConsole and
AppStopMethodWindow ms after each, before terminating it. The server is a GUI
executable with no console and, without this plugin, no windows, so NSSM always
skipped straight to terminating it. This plugin owns a hidden top-level window
that turns WM_CLOSE into the SIGINT a console Ctrl+C would deliver, which
Kolibri's SignalHandler already handles with a graceful shutdown.
"""

import _thread
import signal
from threading import Thread

import win32api
import win32con
import win32gui
from magicbus.plugins import SimplePlugin

from kolibri_app.logger import logging

WINDOW_CLASS = "KolibriServerStopWindow"
# Posted by EXIT to end the window thread without triggering a shutdown.
WM_DESTROY_STOP_WINDOW = win32con.WM_USER + 1


class StopWindowPlugin(SimplePlugin):
    def __init__(self, bus):
        super().__init__(bus)
        self.hwnd = None
        self.thread = None

    def START(self):
        if self.thread and self.thread.is_alive():
            return
        self.thread = Thread(target=self._run_window, daemon=True)
        self.thread.start()

    def EXIT(self):
        if self.hwnd:
            win32gui.PostMessage(self.hwnd, WM_DESTROY_STOP_WINDOW, 0, 0)

    def _run_window(self):
        window_class = win32gui.WNDCLASS()
        window_class.hInstance = win32api.GetModuleHandle(None)
        window_class.lpszClassName = WINDOW_CLASS
        window_class.lpfnWndProc = self._wndproc
        win32gui.RegisterClass(window_class)
        # A hidden top-level window: NSSM finds windows with EnumWindows, which
        # skips message-only (HWND_MESSAGE) windows.
        self.hwnd = win32gui.CreateWindow(
            WINDOW_CLASS,
            WINDOW_CLASS,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            window_class.hInstance,
            None,
        )
        win32gui.PumpMessages()

    def _wndproc(self, hwnd, msg, wparam, lparam):
        if msg == win32con.WM_CLOSE:
            logging.info("Received WM_CLOSE, shutting down Kolibri.")
            # Signal handlers run on the main thread, where the bus is waiting.
            _thread.interrupt_main(signal.SIGINT)
            return 0
        if msg == WM_DESTROY_STOP_WINDOW:
            win32gui.DestroyWindow(hwnd)
            return 0
        if msg == win32con.WM_DESTROY:
            win32gui.PostQuitMessage(0)
            return 0
        return win32gui.DefWindowProc(hwnd, msg, wparam, lparam)
