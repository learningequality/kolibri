import ctypes
import threading
import unittest
from unittest.mock import MagicMock
from unittest.mock import patch

from windows_stubs import server_process_windows
from windows_stubs import Win32Error

TIMEOUT = 5


class _FakePipes:
    """Synchronous pipe handles, which Windows serialises per handle.

    A call blocks until CancelSynchronousIo names its thread, and closing a
    handle waits for any call still blocked on it.
    """

    def __init__(self, clients):
        self.condition = threading.Condition()
        self.clients = clients
        self.created = 0
        self.open = set()
        self.blocked = {}
        self.cancelled = set()

    def CreateNamedPipe(self, *args):
        with self.condition:
            self.created += 1
            self.open.add(self.created)
            return self.created

    def ConnectNamedPipe(self, handle, overlapped):
        with self.condition:
            if self.clients:
                self.clients -= 1
                return
        self._block(handle)

    def ReadFile(self, handle, size):
        self._block(handle)

    def CloseHandle(self, handle):
        with self.condition:
            self.condition.wait_for(lambda: handle not in self.blocked.values())
            self.open.discard(handle)

    def OpenThread(self, access, inherit, thread_id):
        return thread_id

    def CancelSynchronousIo(self, thread_handle):
        with self.condition:
            if thread_handle.value not in self.blocked:
                return 0
            self.cancelled.add(thread_handle.value)
            self.condition.notify_all()
            return 1

    def wait_until_blocked(self, count):
        with self.condition:
            return self.condition.wait_for(lambda: len(self.blocked) == count, TIMEOUT)

    def _block(self, handle):
        thread_id = threading.get_native_id()
        with self.condition:
            self.blocked[thread_id] = handle
            self.condition.notify_all()
            self.condition.wait_for(lambda: thread_id in self.cancelled)
            self.cancelled.discard(thread_id)
            del self.blocked[thread_id]
            self.condition.notify_all()
        raise Win32Error(server_process_windows.winerror.ERROR_OPERATION_ABORTED)


class TestIpcPluginStop(unittest.TestCase):
    def test_stops_while_a_client_is_connected(self):
        pipes = _FakePipes(clients=1)
        windll = MagicMock()
        windll.kernel32.CancelSynchronousIo.side_effect = pipes.CancelSynchronousIo
        plugin = server_process_windows.WindowsIpcPlugin(MagicMock())
        with (
            patch.multiple(
                server_process_windows.win32pipe,
                CreateNamedPipe=pipes.CreateNamedPipe,
                ConnectNamedPipe=pipes.ConnectNamedPipe,
            ),
            patch.multiple(
                server_process_windows.win32file,
                ReadFile=pipes.ReadFile,
                CloseHandle=pipes.CloseHandle,
            ),
            patch.object(
                server_process_windows.win32api, "OpenThread", pipes.OpenThread
            ),
            patch.object(plugin, "_create_security_attributes"),
            patch.object(ctypes, "windll", windll, create=True),
        ):
            plugin.START()
            self.assertTrue(pipes.wait_until_blocked(2))
            stop = threading.Thread(target=plugin.STOP, daemon=True)
            stop.start()
            stop.join(TIMEOUT)
        self.assertFalse(stop.is_alive())
        self.assertEqual(pipes.open, set())
