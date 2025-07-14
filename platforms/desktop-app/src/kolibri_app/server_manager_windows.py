"""Windows Server Manager - UI Process Side

This module manages the Kolibri server subprocess on Windows from the main UI process.
It handles:
- Service detection to avoid spawning a redundant server
- Server subprocess lifecycle management with Job Objects for cleanup
- Named pipe IPC client communication with server subprocess
- Pull-based server readiness handshake to avoid race conditions
- Subprocess output logging and error handling

Architecture Overview:
- Spawns server subprocess with --run-as-server flag
- Uses Windows Job Objects to ensure subprocess cleanup on UI process exit
- Named pipe client connects to server and requests connection info
- Server responds with port and URL when Kolibri is fully initialized
- Handles subprocess crashes and pipe disconnections gracefully
"""
import ctypes.wintypes
import json
import os
import subprocess
import sys
import time
from threading import Event
from threading import Thread

import pywintypes
import win32api
import win32con
import win32file
import win32job
import win32pipe
import winerror
import wx
from kolibri.utils.conf import KOLIBRI_HOME

from kolibri_app.logger import logging


# Named pipe for IPC between UI process and server subprocess
PIPE_NAME = r"\\.\pipe\KolibriAppServerIPC"


def is_service_running(service_name):
    """
    Check if a Windows service is running.
    Returns True if the service is running, False otherwise.
    """
    try:
        # Hide console window that can flash when calling sc.exe
        startupinfo = subprocess.STARTUPINFO()
        startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
        startupinfo.wShowWindow = subprocess.SW_HIDE

        result = subprocess.run(
            ["sc", "query", service_name],
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
            check=True,
            timeout=5,
            startupinfo=startupinfo,
        )
        return "STATE" in result.stdout and "RUNNING" in result.stdout
    except (
        subprocess.CalledProcessError,
        subprocess.TimeoutExpired,
        FileNotFoundError,
    ):
        # CalledProcessError: service doesn't exist
        # TimeoutExpired: safety timeout
        # FileNotFoundError: sc.exe not in PATH
        return False


class WindowsServerManager:
    """
    Manages the Kolibri server subprocess and IPC communication for Windows.
    Uses Job Objects to prevent zombie processes and named pipes for communication.
    """

    def __init__(self, app):
        self.app = app
        self.server_process = None
        self.job_handle = None  # Windows Job Object handle for subprocess cleanup

        # Named pipe IPC client state
        self.pipe_handle = None
        self.pipe_reader_thread = None
        self.pipe_shutdown_event = Event()
        # Handle for pipe reader thread to allow I/O cancellation
        self.pipe_reader_thread_handle = None

    def start(self):
        """
        Start the Kolibri server management.
        If the Kolibri service is running, connect to it.
        Otherwise, launch a new server subprocess.
        """
        if self.server_process:
            return

        # Service name defined in Inno Setup script
        service_name = "Kolibri"

        # Start pipe client for communication with service or subprocess
        self.start_pipe_client()

        if is_service_running(service_name):
            logging.info(f"Detected that the '{service_name}' service is running.")
            logging.info("The UI will connect to the existing service.")
            # Connect to existing service pipe instead of launching new process
        else:
            logging.info(
                f"The '{service_name}' service is not running. Starting a new server process for this session."
            )
            self._launch_server_process()

    def shutdown(self):
        """
        Clean shutdown of server subprocess and IPC communication.
        Job Object provides additional safety for subprocess cleanup.
        """
        self._shutdown_server_process()
        self._shutdown_pipe_thread()
        self._cleanup_handles()

    def _shutdown_server_process(self):
        """Shutdown the server process gracefully."""
        if self.server_process and self.server_process.poll() is None:
            logging.info("Shutting down server process...")
            try:
                # Attempt graceful shutdown first - Job Object provides backup cleanup
                self.server_process.terminate()
                self.server_process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                logging.warning(
                    "Server process did not terminate gracefully, forcing kill..."
                )
                self.server_process.kill()
                self.server_process.wait()
            except Exception as e:
                logging.error(f"Error shutting down server process: {e}")

    def _shutdown_pipe_thread(self):
        """Stop pipe communication thread."""
        if self.pipe_reader_thread and self.pipe_reader_thread.is_alive():
            logging.info("Stopping pipe reader thread...")
            self.pipe_shutdown_event.set()

            # Use CancelSynchronousIo to unblock thread stuck in blocking I/O
            # Prevents app hanging on exit when service is running
            if self.pipe_reader_thread_handle:
                try:
                    handle_as_int = int(self.pipe_reader_thread_handle)
                    ctypes.windll.kernel32.CancelSynchronousIo(
                        ctypes.wintypes.HANDLE(handle_as_int)
                    )
                except Exception as e:
                    logging.error(
                        f"Error calling CancelSynchronousIo: {e}", exc_info=True
                    )

            self.pipe_reader_thread.join(timeout=5)

    def _cleanup_handles(self):
        """Clean up all handles."""
        if self.pipe_handle:
            try:
                win32file.CloseHandle(self.pipe_handle)
            except pywintypes.error:
                pass  # Handle already closed/invalid
            self.pipe_handle = None
        if self.pipe_reader_thread_handle:
            try:
                win32api.CloseHandle(self.pipe_reader_thread_handle)
            except pywintypes.error:
                pass  # Handle already closed/invalid
            self.pipe_reader_thread_handle = None
        if self.job_handle:
            try:
                win32api.CloseHandle(self.job_handle)
                self.job_handle = None
                logging.info("Closed job object handle.")
            except Exception as e:
                logging.error(f"Error closing job object handle: {e}")

    def _launch_server_process(self):
        """
        Launch the Kolibri server subprocess with Job Object management.
        Job Objects provide automatic cleanup to prevent zombie processes.
        """
        # Set up Job Object for subprocess cleanup
        try:
            self.job_handle = win32job.CreateJobObject(None, "")

            # Query current job limits to modify them
            extended_info = win32job.QueryInformationJobObject(
                self.job_handle, win32job.JobObjectExtendedLimitInformation
            )

            # Configure job to terminate all processes when the job handle closes
            # This happens automatically when the UI process exits
            extended_info["BasicLimitInformation"][
                "LimitFlags"
            ] = win32job.JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
            win32job.SetInformationJobObject(
                self.job_handle,
                win32job.JobObjectExtendedLimitInformation,
                extended_info,
            )
        except Exception as e:
            logging.error(
                f"Failed to create or configure job object: {e}", exc_info=True
            )
            self.job_handle = None

        # Launch the server subprocess
        try:
            # Build command line - detect PyInstaller bundle vs development mode
            if getattr(sys, "frozen", False):
                # PyInstaller bundle mode - use current executable with server flag
                cmd = [sys.executable, "--run-as-server"]
            else:
                # Development mode - run as Python module
                cmd = [sys.executable, "-m", "kolibri_app", "--run-as-server"]

            env = os.environ.copy()
            env["KOLIBRI_HOME"] = os.environ.get("KOLIBRI_HOME", KOLIBRI_HOME)
            env["DJANGO_SETTINGS_MODULE"] = "kolibri_app.django_app_settings"
            logging.info(f"Launching server subprocess: {' '.join(cmd)}")

            # Configure subprocess to run with hidden console window
            startupinfo = subprocess.STARTUPINFO()
            startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW

            # Launch subprocess with stdout/stderr pipes for logging
            self.server_process = subprocess.Popen(
                cmd,
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                startupinfo=startupinfo,
            )

            # Start background threads to forward subprocess output to application logging
            Thread(
                target=self._log_subprocess_output,
                args=(self.server_process.stdout, "stdout"),
                daemon=True,
            ).start()
            Thread(
                target=self._log_subprocess_output,
                args=(self.server_process.stderr, "stderr"),
                daemon=True,
            ).start()

            # Assign subprocess to Job Object for automatic cleanup
            if self.job_handle:
                try:
                    proc_handle = win32api.OpenProcess(
                        win32con.PROCESS_ALL_ACCESS, False, self.server_process.pid
                    )
                    win32job.AssignProcessToJobObject(self.job_handle, proc_handle)
                    logging.info(
                        f"Successfully assigned server process (PID: {self.server_process.pid}) to job object."
                    )
                except Exception as e:
                    logging.error(
                        f"Failed to assign process to job object: {e}", exc_info=True
                    )

        except Exception as e:
            logging.error(f"Failed to launch server process: {e}", exc_info=True)
            wx.MessageBox(
                f"Failed to start Kolibri server: {e}", "Error", wx.OK | wx.ICON_ERROR
            )

    def _log_subprocess_output(self, pipe, pipe_name):
        """
        Forward subprocess stdout/stderr to application logging system.
        """
        try:
            for line in iter(pipe.readline, b""):
                if line:
                    # Forward subprocess output to main application logging
                    logging.info(
                        f"Server {pipe_name}: {line.decode('utf-8', errors='replace').strip()}"
                    )
        finally:
            pipe.close()

    def start_pipe_client(self):
        """
        Start the named pipe client thread for IPC communication.
        Handles pipe connection, server info requests, and reconnection.
        """
        if self.pipe_reader_thread and self.pipe_reader_thread.is_alive():
            return
        logging.info("Starting pipe client reader thread...")
        self.pipe_shutdown_event.clear()
        self.pipe_reader_thread = Thread(
            target=self._pipe_reader_thread_func, daemon=True
        )
        self.pipe_reader_thread.start()

        # Get thread handle for I/O cancellation
        # Wait for thread to have an ID before getting handle
        while self.pipe_reader_thread.ident is None:
            time.sleep(0.01)

        try:
            # THREAD_TERMINATE permission required for CancelSynchronousIo
            self.pipe_reader_thread_handle = win32api.OpenThread(
                win32con.THREAD_TERMINATE, False, self.pipe_reader_thread.ident
            )
        except pywintypes.error as e:
            logging.error(f"Failed to get handle for pipe reader thread: {e}")

    def _pipe_reader_thread_func(self):
        """
        Named pipe client thread main loop.
        Implements pull-based server readiness handshake to avoid race conditions.
        """
        while not self.pipe_shutdown_event.is_set():
            try:
                if self._connect_to_pipe():
                    self._process_pipe_messages()
            except pywintypes.error as e:
                if self._handle_pipe_error(e):
                    break
            except Exception as e:
                logging.error(f"Error in pipe reader thread: {e}", exc_info=True)
                if self.pipe_shutdown_event.wait(timeout=2):
                    break

    def _connect_to_pipe(self):
        """Connect to the named pipe. Returns True if successful, False if should retry."""
        # Use timeout on WaitNamedPipe to allow periodic shutdown event checks
        try:
            win32pipe.WaitNamedPipe(PIPE_NAME, 2000)
        except pywintypes.error as e:
            # Timeout expected if pipe isn't ready, loop again
            if e.winerror == winerror.ERROR_SEM_TIMEOUT:
                return False
            raise

        self.pipe_handle = win32file.CreateFile(
            PIPE_NAME,
            win32file.GENERIC_READ | win32file.GENERIC_WRITE,
            0,
            None,
            win32file.OPEN_EXISTING,
            0,
            None,
        )

        logging.info("Connected to named pipe.")

        # Immediately request server connection information (pull-based handshake)
        self._send_pipe_message({"type": "request_server_info"})
        return True

    def _process_pipe_messages(self):
        """Process messages from the connected pipe."""
        # Message processing loop for connected pipe
        while not self.pipe_shutdown_event.is_set():
            hr, data = win32file.ReadFile(self.pipe_handle, 4096)
            if hr == winerror.ERROR_SUCCESS or hr == winerror.ERROR_MORE_DATA:
                message = json.loads(data.decode("utf-8"))
                logging.debug(f"Pipe client received message: {message}")
                wx.CallAfter(self._handle_pipe_message, message)
            else:
                # Pipe closed by server - break inner loop to reconnect
                break

    def _handle_pipe_error(self, e):
        """Handle pipe errors. Returns True if should break main loop, False to continue."""
        # - ADDED - This is the clean exit path. CancelSynchronousIo causes
        # ReadFile to fail with this specific error.
        if e.winerror == winerror.ERROR_OPERATION_ABORTED:
            return True

        if (
            e.winerror == winerror.ERROR_FILE_NOT_FOUND
            or e.winerror == winerror.ERROR_BROKEN_PIPE
        ):
            logging.info("Pipe not available or broken, will retry...")
        else:
            logging.error(f"Pipe error: {e}")

        # Use interruptible wait instead of blocking sleep
        return self.pipe_shutdown_event.wait(timeout=2)

    def _handle_pipe_message(self, message):
        """
        Handle messages received from server subprocess via named pipe.
        Runs on main UI thread and processes server responses.
        """
        msg_type = message.get("type")
        if msg_type == "server_ready":
            port = message["port"]
            root_url = message["root_url"]
            logging.info(f"Server is ready on port {port}. Loading URL.")
            self.app.load_kolibri(port, root_url)

    def _send_pipe_message(self, message):
        """
        Send JSON message to server subprocess via named pipe.
        """
        if self.pipe_handle:
            try:
                # Encode and send JSON message to server subprocess
                encoded_message = json.dumps(message).encode("utf-8")
                win32file.WriteFile(self.pipe_handle, encoded_message)
            except pywintypes.error as e:
                logging.error(f"Failed to send message via pipe: {e}")
        else:
            logging.warning("Cannot send message, pipe not connected.")
