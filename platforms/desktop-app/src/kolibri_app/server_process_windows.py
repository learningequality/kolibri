"""Windows Server Subprocess Implementation

This module implements the Kolibri server that runs as a separate subprocess on Windows.
It uses a MagicBus plugin (`WindowsIpcPlugin`) integrated with `KolibriProcessBus`
to manage Inter-Process Communication (IPC) with the main UI process via a named pipe.

Architecture Overview:
- The main UI process spawns this module as a subprocess with the --run-as-server flag.
- `ServerProcess` initializes Kolibri and the `KolibriProcessBus`.
- The `WindowsIpcPlugin` is subscribed to the bus. On its `START` event, it creates
  a named pipe and listens for a connection from the UI process in a background thread.
- When the Kolibri server is ready, it fires a 'SERVING' event. The plugin
  catches this and stores the server's port and initialization URL.
- The UI process connects and sends a `request_server_info` message (pull-based handshake).
- The plugin responds with the stored connection details, allowing the UI to load Kolibri.
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

from kolibri.main import initialize
from kolibri.core.device.utils import app_initialize_url
from kolibri.utils.conf import OPTIONS
from kolibri.utils.server import KolibriProcessBus
from kolibri_app.logger import logging

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
        self.pipe = None
        self.pipe_lock = Lock()
        self.shutdown_event = Event()

        self.server_ready_event = Event()
        self.ready_port = None
        self.ready_root_url = None

        self.bus.subscribe("SERVING", self.on_server_start)

    def START(self):
        """Plugin start method: starts the IPC thread."""
        self.pipe_thread = Thread(target=self._pipe_server_loop, daemon=True)
        self.pipe_thread.start()
        logging.info("WindowsIpcPlugin started and is waiting for clients.")

    def STOP(self):
        """Plugin stop method: cleans up the IPC thread."""
        self.shutdown_event.set()
        self._cleanup_pipe()
        if self.pipe_thread:
            self.pipe_thread.join(timeout=5)
        logging.info("WindowsIpcPlugin stopped.")

    def _construct_server_urls(self, port):
        """
        Construct the server URLs based on the port.
        """
        kolibri_origin = f"http://localhost:{port}"
        root_url = kolibri_origin + app_initialize_url()
        return kolibri_origin, root_url

    def on_server_start(self, port):
        """
        Callback invoked when the Kolibri server's 'SERVING' event fires.
        """
        logging.info(f"Server is running on port {port}. Ready for client requests.")

        _, root_url = self._construct_server_urls(port)

        self.ready_port = port
        self.ready_root_url = root_url
        self.server_ready_event.set()

    def _create_server_ready_payload(self):
        """
        Create the server ready response payload.
        """
        return {
            "type": "server_ready",
            "port": self.ready_port,
            "root_url": self.ready_root_url,
        }

    def _handle_server_info_request(self):
        """
        Handles a server info request from the UI process via the pipe.
        """
        # Wait for the on_server_start callback to fire
        if self.server_ready_event.wait(timeout=60):
            payload = self._create_server_ready_payload()
            logging.info("Client requested server info, sending ready response.")
            self._send_pipe_message(payload)
        else:
            logging.error(
                "Server info was requested, but server failed to become ready in time."
            )

    def _send_pipe_message(self, message):
        """
        Send a JSON message to the connected client via the pipe.
        """
        if not self.pipe:
            logging.warning("Cannot send message, pipe not connected.")
            return

        try:
            encoded_message = json.dumps(message).encode("utf-8")
            win32file.WriteFile(self.pipe, encoded_message)
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

    def _wait_for_client_connection(self):
        """
        Block until a client connects to the named pipe.
        """
        assert (
            self.pipe is not None
        ), "Pipe must be created before waiting for connection"
        win32pipe.ConnectNamedPipe(self.pipe, None)
        logging.info("Client connected to named pipe.")

    def _process_client_messages(self):
        """
        Process messages from the connected client in a loop.
        """
        while not self.shutdown_event.is_set():
            assert self.pipe is not None, "Pipe must be connected before reading"
            hr, data = win32file.ReadFile(self.pipe, 4096)
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
                self._handle_server_info_request()

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

    def _cleanup_pipe(self):
        """
        Clean up the pipe handle safely.
        """
        with self.pipe_lock:
            if self.pipe:
                try:
                    win32file.CloseHandle(self.pipe)
                except pywintypes.error as e:
                    # This is expected if STOP() already closed the handle.
                    logging.debug(f"Error closing pipe handle during cleanup: {e}")
                finally:
                    self.pipe = None

    def _pipe_server_loop(self):
        """
        Main pipe server loop, coordinates pipe creation, client handling, and cleanup.
        """
        logging.info("Pipe server thread started.")

        security_attributes = self._create_security_attributes()

        while not self.shutdown_event.is_set():
            # Create the handle locally so we don't expose a partially
            # created object to other threads.
            pipe_handle = self._create_named_pipe(security_attributes)

            # Assign the handle to the instance within the lock.
            with self.pipe_lock:
                if self.shutdown_event.is_set():
                    # Handle edge case where STOP was called while we created the pipe.
                    win32file.CloseHandle(pipe_handle)
                    break
                self.pipe = pipe_handle

            try:
                self._wait_for_client_connection()
                self._process_client_messages()

            except pywintypes.error as e:
                # This is expected when the handle is closed by STOP()
                self._handle_pipe_error(e)
            except (json.JSONDecodeError, UnicodeDecodeError, OSError) as e:
                if not self.shutdown_event.is_set():
                    logging.error(f"Error in pipe server thread: {e}", exc_info=True)
            finally:
                self._cleanup_pipe()

        logging.info("Pipe server thread finished.")


class ServerProcess:
    """
    Main server process coordinator for Windows subprocess implementation.
    Manages the Kolibri server initialization and runs it with the IPC plugin.
    """

    def __init__(self):
        self.kolibri_server = None

    def _initialize_kolibri(self):
        """
        Initialize Kolibri with required plugins and configuration.
        """
        logging.info("Server process: Initializing Kolibri...")
        initialize()

    def _create_kolibri_server(self):
        """
        Create and configure the Kolibri server instance.
        """
        return KolibriProcessBus(
            port=OPTIONS["Deployment"]["HTTP_PORT"],
            zip_port=OPTIONS["Deployment"]["ZIP_CONTENT_PORT"],
        )

    def _setup_ipc_plugin(self):
        """
        Create and subscribe the IPC plugin to the server.
        """
        ipc_plugin = WindowsIpcPlugin(self.kolibri_server)
        ipc_plugin.subscribe()
        return ipc_plugin

    def run(self):
        """
        Main server process entry point, initializes and runs Kolibri server.
        The server runs until terminated by the Job Object or explicit shutdown.
        """
        try:
            self._initialize_kolibri()
            self.kolibri_server = self._create_kolibri_server()
            self._setup_ipc_plugin()

            logging.info("Server process: Starting Kolibri server...")
            # Start serving, this blocks until shutdown
            self.kolibri_server.run()
        except (ImportError, OSError, RuntimeError, ValueError) as e:
            logging.error(f"Server process error: {e}", exc_info=True)
            sys.exit(1)
