"""Windows Server Subprocess Implementation

This module implements the Kolibri server that runs as a separate subprocess on Windows.
It uses a MagicBus plugin (`WindowsIpcPlugin`) integrated with `KolibriProcess`
to manage Inter-Process Communication (IPC) with the main UI process via a named pipe.

Architecture Overview:
- The main UI process spawns this module as a subprocess with the --run-as-server flag.
- `run_windows_server()` creates a `KolibriProcess` and adds the Windows IPC plugin.
- The `WindowsIpcPlugin` is subscribed to the bus. On its `START` event, it creates
  a named pipe and accepts UI process connections in a background thread, serving
  each client connection on its own thread.
- When the Kolibri server is ready, it fires a 'SERVING' event. The plugin
  catches this and stores the server's port.
- The UI process connects and sends a `request_server_info` message (pull-based handshake).
- The plugin responds with a URL carrying a login token for the connecting Windows user.
- On the `STOP` event, the plugin cleans up its thread and handles.
"""

import json
import os
import sys
import time
from threading import Event
from threading import Lock
from threading import Thread

import pywintypes
import win32file
import win32pipe
import win32security
import winerror
from magicbus.plugins import SimplePlugin

# Fix Python path for PyInstaller builds
if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
    sys.path.insert(0, os.path.join(sys._MEIPASS, "kolibrisrc"))
    sys.path.insert(0, os.path.join(sys._MEIPASS, "kolibrisrc", "kolibri", "dist"))

from kolibri.core.device.utils import app_initialize_url
from kolibri_app.kolibri_plugin import KolibriAppGetOSUserHook
from kolibri_app.kolibri_process import KolibriProcess
from kolibri_app.logger import logging
from kolibri_app.windows_users import pipe_client_user_info

# Named pipe for IPC between UI process and server subprocess
# Uses Windows named pipe format: \\.<hostname>\pipe\<pipename>
PIPE_NAME = r"\\.\pipe\KolibriAppServerIPC"


class WindowsIpcPlugin(SimplePlugin):
    """
    A magicbus plugin to manage named pipe IPC for the Windows server subprocess.
    Handles pipe creation, client communication, and server readiness signaling.
    """

    def __init__(self, bus):
        super().__init__(bus)
        self.pipe_thread = None
        self.pipes = []
        self.pipes_lock = Lock()
        self.shutdown_event = Event()

        self.server_ready_event = Event()
        self.ready_port = None

        self.bus.subscribe("SERVING", self.on_server_start)

    def START(self):
        """Plugin start method: starts the IPC thread."""
        self.pipe_thread = Thread(target=self._pipe_server_loop, daemon=True)
        self.pipe_thread.start()
        logging.info("WindowsIpcPlugin started and is waiting for clients.")

    def STOP(self):
        """Plugin stop method: cleans up the IPC thread."""
        self.shutdown_event.set()
        with self.pipes_lock:
            pipes = list(self.pipes)
        for pipe in pipes:
            self._close_pipe(pipe)
        if self.pipe_thread:
            self.pipe_thread.join(timeout=5)
        logging.info("WindowsIpcPlugin stopped.")

    def on_server_start(self, port):
        """
        Callback invoked when the Kolibri server's 'SERVING' event fires.
        """
        logging.info(f"Server is running on port {port}. Ready for client requests.")
        self.ready_port = port
        self.server_ready_event.set()

    def _handle_server_info_request(self, pipe):
        """
        Handles a server info request from the UI process via the pipe.
        """
        # Wait for the on_server_start callback to fire
        if self.server_ready_event.wait(timeout=60):
            user = pipe_client_user_info(pipe)
            auth_token = KolibriAppGetOSUserHook.login_tokens.generate_for_user(
                user.user_name, user.is_admin
            )
            logging.info(f"Sending server info to Windows user {user.user_name}.")
            root_url = f"http://localhost:{self.ready_port}" + app_initialize_url(
                auth_token=auth_token
            )
            self._send_pipe_message(
                pipe,
                {"type": "server_ready", "port": self.ready_port, "root_url": root_url},
            )
        else:
            logging.error(
                "Server info was requested, but server failed to become ready in time."
            )

    def _send_pipe_message(self, pipe, message):
        """
        Send a JSON message to the connected client via the pipe.
        """
        try:
            encoded_message = json.dumps(message).encode("utf-8")
            win32file.WriteFile(pipe, encoded_message)
        except pywintypes.error as e:
            if e.winerror == winerror.ERROR_BROKEN_PIPE:
                logging.info("Client disconnected, cannot send message.")
            else:
                raise

    def _create_security_attributes(self):
        """
        Create security attributes for the named pipe.
        """
        sa = win32security.SECURITY_ATTRIBUTES()
        sa.bInheritHandle = False
        security_descriptor_sddl = "D:(A;OICI;GRGW;;;AU)"
        sa.SECURITY_DESCRIPTOR = (
            win32security.ConvertStringSecurityDescriptorToSecurityDescriptor(
                security_descriptor_sddl, win32security.SDDL_REVISION_1
            )
        )
        return sa

    def _create_named_pipe(self, security_attributes):
        """
        Create and configure the named pipe for IPC.
        """
        pipe = win32pipe.CreateNamedPipe(
            PIPE_NAME,
            win32pipe.PIPE_ACCESS_DUPLEX,
            win32pipe.PIPE_TYPE_MESSAGE
            | win32pipe.PIPE_READMODE_MESSAGE
            | win32pipe.PIPE_WAIT,
            win32pipe.PIPE_UNLIMITED_INSTANCES,
            65536,
            65536,
            0,
            security_attributes,
        )
        logging.info(f"Named pipe '{PIPE_NAME}' created. Waiting for client...")
        return pipe

    def _process_client_messages(self, pipe):
        """
        Process messages from the connected client in a loop.
        """
        while not self.shutdown_event.is_set():
            hr, data = win32file.ReadFile(pipe, 4096)
            if hr != winerror.ERROR_SUCCESS and hr != winerror.ERROR_MORE_DATA:
                break

            if isinstance(data, bytes):
                text_data = data.decode("utf-8")
            else:
                text_data = data

            # Parse JSON message from client
            message = json.loads(text_data)
            logging.debug(f"Pipe server received message: {message}")

            # Handle server info requests (part of startup handshake)
            if message.get("type") == "request_server_info":
                # The plugin handles this request directly
                self._handle_server_info_request(pipe)

    def _handle_pipe_error(self, error):
        """
        Handle specific pipe errors with appropriate logging and actions.
        """
        if error.winerror == winerror.ERROR_PIPE_BUSY:
            logging.warning("Pipe is busy, retrying...")
            time.sleep(1)
        elif error.winerror == winerror.ERROR_BROKEN_PIPE:
            logging.info("Client disconnected.")
        else:
            logging.error(f"Pipe server error: {error}", exc_info=True)

    def _close_pipe(self, pipe):
        with self.pipes_lock:
            if pipe not in self.pipes:
                return
            self.pipes.remove(pipe)
        try:
            win32file.CloseHandle(pipe)
        except pywintypes.error as e:
            logging.debug(f"Error closing pipe handle: {e}")

    def _pipe_server_loop(self):
        """
        Main pipe server loop, accepts each client and serves it on its own thread.
        """
        logging.info("Pipe server thread started.")

        security_attributes = self._create_security_attributes()

        while not self.shutdown_event.is_set():
            pipe = self._create_named_pipe(security_attributes)
            with self.pipes_lock:
                if self.shutdown_event.is_set():
                    # Handle edge case where STOP was called while we created the pipe.
                    win32file.CloseHandle(pipe)
                    break
                self.pipes.append(pipe)

            try:
                win32pipe.ConnectNamedPipe(pipe, None)
            except pywintypes.error as e:
                # This is expected when the handle is closed by STOP()
                self._handle_pipe_error(e)
                self._close_pipe(pipe)
                continue
            logging.info("Client connected to named pipe.")
            Thread(target=self._serve_client, args=(pipe,), daemon=True).start()

        logging.info("Pipe server thread finished.")

    def _serve_client(self, pipe):
        try:
            self._process_client_messages(pipe)
        except pywintypes.error as e:
            self._handle_pipe_error(e)
        except (json.JSONDecodeError, UnicodeDecodeError, OSError) as e:
            if not self.shutdown_event.is_set():
                logging.error(f"Error serving pipe client: {e}", exc_info=True)
        finally:
            self._close_pipe(pipe)


class WindowsKolibriProcess(KolibriProcess):
    """
    Windows-specific Kolibri process with IPC plugin for named pipe communication.

    This class is used in the Windows server subprocess (spawned with --run-as-server).
    It inherits from KolibriProcess and adds the WindowsIpcPlugin for communication
    with the main UI process via named pipes.
    """

    def __init__(self):
        super().__init__()

        self.ipc_plugin = WindowsIpcPlugin(self)
        self.ipc_plugin.subscribe()
