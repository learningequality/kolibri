import signal
import unittest
from unittest.mock import MagicMock

from windows_stubs import stop_window


class TestStopWindow(unittest.TestCase):
    def setUp(self):
        self.received = []
        previous = signal.signal(signal.SIGINT, lambda *args: self.received.append(1))
        self.addCleanup(signal.signal, signal.SIGINT, previous)
        self.plugin = stop_window.StopWindowPlugin(MagicMock())

    def test_close_message_shuts_kolibri_down_as_ctrl_c_does(self):
        self.plugin._wndproc(1, stop_window.win32con.WM_CLOSE, 0, 0)
        self.assertEqual(self.received, [1])

    def test_other_messages_do_not_shut_kolibri_down(self):
        self.plugin._wndproc(1, stop_window.win32con.WM_PAINT, 0, 0)
        self.assertEqual(self.received, [])
