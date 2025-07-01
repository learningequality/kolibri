"""Windows Server Subprocess Implementation

This module implements the Kolibri server that runs as a separate subprocess on Windows.
It handles:
- Named pipe IPC communication with the main UI process
- Server lifecycle management and readiness signaling
- PyInstaller compatibility for bundled executables

Architecture Overview:
- Main UI process spawns this as subprocess with --run-as-server flag
- Server initializes Kolibri and starts listening on available port
- Named pipe server accepts connections from UI process
- Pull-based handshake: UI requests server info when ready
- Server responds with port and initialization URL
"""
import json
import os
import sys
import time
from threading import Event
from threading import Thread

import pywintypes
import win32file
import win32pipe
import winerror

# Fix Python path for PyInstaller builds
if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
    sys.path.insert(0, os.path.join(sys._MEIPASS, "kolibrisrc"))
    sys.path.insert(0, os.path.join(sys._MEIPASS, "kolibrisrc", "kolibri", "dist"))

from kolibri.main import initialize, enable_plugin
from kolibri.plugins.app.utils import interface, SHARE_FILE
from kolibri.utils.conf import OPTIONS
from kolibri.utils.server import KolibriProcessBus
from kolibri_app.logger import logging

# File sharing disabled to mirror original implementation
share_file = None

# Named pipe for IPC between UI process and server subprocess
# Uses Windows named pipe format: \\.<hostname>\pipe\<pipename>
PIPE_NAME = r"\\.\pipe\KolibriAppServerIPC"


class PipeServerThread(Thread):
    """
    Manages named pipe server communication in a dedicated thread.
    Handles client connections, processes messages, and maintains IPC until shutdown.
    """

    def __init__(self, server_process):
        super().__init__(daemon=True)
        self.server_process = server_process
        self.pipe = None

    def run(self):
        """Main pipe server loop - handles client connections and message processing."""
        logging.info("Pipe server thread started.")
        while not self.server_process.shutdown_event.is_set():
            self.pipe = None
            try:
                # Create named pipe with message mode for structured communication
                self.pipe = win32pipe.CreateNamedPipe(
                    PIPE_NAME,
                    win32pipe.PIPE_ACCESS_DUPLEX,
                    win32pipe.PIPE_TYPE_MESSAGE
                    | win32pipe.PIPE_READMODE_MESSAGE
                    | win32pipe.PIPE_WAIT,
                    win32pipe.PIPE_UNLIMITED_INSTANCES,
                    65536,
                    65536,
                    0,
                    None,
                )

                logging.info(f"Named pipe '{PIPE_NAME}' created. Waiting for client...")
                # Block until a client connects to the pipe
                win32pipe.ConnectNamedPipe(self.pipe, None)
                logging.info("Client connected to named pipe.")

                # Message processing loop for connected client
                while not self.server_process.shutdown_event.is_set():
                    hr, data = win32file.ReadFile(self.pipe, 4096)
                    if hr != winerror.ERROR_SUCCESS and hr != winerror.ERROR_MORE_DATA:
                        break

                    # Parse JSON message from client
                    message = json.loads(data.decode("utf-8"))
                    logging.debug(f"Pipe server received message: {message}")

                    # Handle server info requests (part of startup handshake)
                    if message.get("type") == "request_server_info":
                        self.server_process.handle_server_info_request()

            except pywintypes.error as e:
                if e.winerror == winerror.ERROR_PIPE_BUSY:
                    logging.warning("Pipe is busy, retrying...")
                    time.sleep(1)
                elif e.winerror == winerror.ERROR_BROKEN_PIPE:
                    logging.info("Client disconnected.")
                else:
                    logging.error(f"Pipe server error: {e}", exc_info=True)
            except Exception as e:
                logging.error(
                    f"Unhandled error in pipe server thread: {e}", exc_info=True
                )
            finally:
                if self.pipe:
                    win32file.CloseHandle(self.pipe)
                    self.pipe = None
        logging.info("Pipe server thread finished.")

    def send_message(self, message):
        """Send JSON message to connected client."""
        if not self.pipe:
            logging.warning("Cannot send message, pipe not connected.")
            return

        try:
            # Encode message as JSON and send via pipe
            encoded_message = json.dumps(message).encode("utf-8")
            win32file.WriteFile(self.pipe, encoded_message)
        except pywintypes.error as e:
            if e.winerror == winerror.ERROR_BROKEN_PIPE:
                logging.info("Client disconnected, cannot send message.")
            else:
                raise


class ServerProcess:
    """
    Main server process coordinator for Windows subprocess implementation.
    Manages server initialization, named pipe communication, and handshake coordination.
    """

    def __init__(self):
        # Shutdown coordination between threads
        self.shutdown_event = Event()
        self.kolibri_server = None

        # Named pipe communication thread
        self.pipe_server_thread = None

        # Server readiness coordination for startup handshake
        # These are set when Kolibri server starts and used to respond to client requests
        self.server_ready_event = Event()
        self.ready_port = None
        self.ready_root_url = None

    def on_server_start(self, port):
        """
        Callback invoked when Kolibri server starts.
        Prepares connection details for UI process handshake.
        """
        logging.info(f"Server is running on port {port}. Ready for client requests.")

        # Build the complete initialization URL for the UI process
        kolibri_origin = f"http://localhost:{port}"
        root_url = kolibri_origin + interface.get_initialize_url()

        self.ready_port = port
        self.ready_root_url = root_url
        self.server_ready_event.set()

    def handle_server_info_request(self):
        """
        Handle server info request from UI process.
        Implements pull-based readiness pattern to avoid race conditions.
        """
        # Wait for Kolibri server to complete initialization
        if self.server_ready_event.wait(timeout=60):
            # Send connection details to UI process
            payload = {
                "type": "server_ready",
                "port": self.ready_port,
                "root_url": self.ready_root_url,
            }
            logging.info("Client requested server info, sending ready response.")
            self.pipe_server_thread.send_message(payload)
        else:
            logging.error(
                "Server info was requested, but server failed to become ready in time."
            )

    def run(self):
        """
        Main server process entry point - initializes and runs Kolibri server.
        The server runs until terminated by the Job Object or explicit shutdown.
        """
        try:
            logging.info("Server process: Initializing Kolibri...")
            enable_plugin("kolibri.plugins.app")
            initialize()

            # Start IPC communication thread
            self.pipe_server_thread = PipeServerThread(self)
            self.pipe_server_thread.start()

            # File sharing integration - intentionally disabled to mirror original implementation
            # This check will always be False since share_file is None
            if callable(share_file):
                interface.register_capabilities(**{SHARE_FILE: share_file})

            # Create Kolibri server instance
            self.kolibri_server = KolibriProcessBus(
                port=OPTIONS["Deployment"]["HTTP_PORT"],
                zip_port=OPTIONS["Deployment"]["ZIP_CONTENT_PORT"],
            )
            self.kolibri_server.subscribe("SERVING", self.on_server_start)

            logging.info("Server process: Starting Kolibri server...")
            # Start serving - this blocks until shutdown
            self.kolibri_server.run()
        except Exception as e:
            logging.error(f"Server process error: {e}", exc_info=True)
            sys.exit(1)
