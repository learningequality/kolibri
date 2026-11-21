import threading
import unittest
from unittest.mock import patch

from windows_stubs import service

TIMEOUT = 5


class _FakeStdin:
    def __init__(self, on_close):
        self.on_close = on_close

    def close(self):
        self.on_close()


class _FakeServer:
    def __init__(self, pid, stops_when_stdin_closes, stop_delay):
        self.pid = pid
        self.exited = threading.Event()
        self.killed = False
        self.stdin = _FakeStdin(self._stdin_closed)
        self.stops_when_stdin_closes = stops_when_stdin_closes
        self.stop_delay = stop_delay

    def _stdin_closed(self):
        if self.stops_when_stdin_closes:
            threading.Timer(self.stop_delay, self.exit).start()

    def exit(self):
        self.exited.set()

    def poll(self):
        return 0 if self.exited.is_set() else None

    def wait(self, timeout=None):
        if not self.exited.wait(timeout):
            raise service.subprocess.TimeoutExpired("server", timeout)
        return 0


JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x2000


class _FakeWindows:
    """Servers launched into job objects, killed on close when the job says so."""

    def __init__(self, server_stops=True, stop_delay=0):
        self.server_stops = server_stops
        self.stop_delay = stop_delay
        self.servers = []
        self.launched = threading.Semaphore(0)
        self.jobs = {}
        self.job_limits = {}

    def Popen(self, cmd, **kwargs):
        server = _FakeServer(
            pid=len(self.servers) + 1,
            stops_when_stdin_closes=self.server_stops
            and kwargs.get("stdin") == service.subprocess.PIPE
            and service.STOP_WHEN_STDIN_CLOSES in cmd,
            stop_delay=self.stop_delay,
        )
        self.servers.append(server)
        self.launched.release()
        return server

    def OpenProcess(self, access, inherit, pid):
        return pid

    def CreateJobObject(self, attributes, name):
        job = f"job{len(self.jobs)}"
        self.jobs[job] = []
        return job

    def QueryInformationJobObject(self, job, info_class):
        return {"BasicLimitInformation": {"LimitFlags": self.job_limits.get(job, 0)}}

    def SetInformationJobObject(self, job, info_class, info):
        self.job_limits[job] = info["BasicLimitInformation"]["LimitFlags"]

    def AssignProcessToJobObject(self, job, process):
        self.jobs[job].append(self.servers[process - 1])

    def CloseHandle(self, handle):
        kills = self.job_limits.get(handle, 0) & JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
        for server in self.jobs.pop(handle, []):
            if kills and not server.exited.is_set():
                server.killed = True
                server.exit()

    def wait_for_launches(self, count):
        return all(self.launched.acquire(timeout=TIMEOUT) for _ in range(count))


class TestKolibriService(unittest.TestCase):
    def _start(self, windows, **constants):
        constants = {
            "SERVER_POLL_SECONDS": 0.01,
            "RELAUNCH_THROTTLE_SECONDS": 0,
            **constants,
        }
        patches = [
            patch.object(service.subprocess, "Popen", windows.Popen),
            patch.object(service.win32api, "OpenProcess", windows.OpenProcess),
            patch.object(service.win32api, "CloseHandle", windows.CloseHandle),
            patch.multiple(
                service.win32job,
                CreateJobObject=windows.CreateJobObject,
                QueryInformationJobObject=windows.QueryInformationJobObject,
                SetInformationJobObject=windows.SetInformationJobObject,
                AssignProcessToJobObject=windows.AssignProcessToJobObject,
                JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE=JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
            ),
            *(patch.object(service, name, value) for name, value in constants.items()),
        ]
        for p in patches:
            p.start()
            self.addCleanup(p.stop)
        self.service = service.KolibriService([service.SERVICE_NAME])
        self.statuses = []
        self.service.ReportServiceStatus = lambda status, **kwargs: (
            self.statuses.append(status)
        )
        self.run_thread = threading.Thread(target=self.service.SvcDoRun, daemon=True)
        self.run_thread.start()

    def _stop(self, control="SvcStop"):
        getattr(self.service, control)()
        self.run_thread.join(TIMEOUT)
        self.assertFalse(self.run_thread.is_alive())

    def test_starts_the_server_again_after_it_stops_for_a_restart(self):
        windows = _FakeWindows()
        self._start(windows)
        self.assertTrue(windows.wait_for_launches(1))
        windows.servers[0].exit()
        self.assertTrue(windows.wait_for_launches(1))
        self._stop()

    def test_waits_before_starting_a_server_that_exited_right_after_launch(self):
        windows = _FakeWindows()
        self._start(windows, RELAUNCH_THROTTLE_SECONDS=60)
        self.assertTrue(windows.wait_for_launches(1))
        windows.servers[0].exit()
        self.assertFalse(windows.launched.acquire(timeout=0.2))
        self._stop()
        self.assertEqual(len(windows.servers), 1)

    def test_stopping_the_service_stops_the_server_gracefully(self):
        windows = _FakeWindows()
        self._start(windows)
        self.assertTrue(windows.wait_for_launches(1))
        self._stop()
        [server] = windows.servers
        self.assertTrue(server.exited.is_set())
        self.assertFalse(server.killed)

    def test_windows_shutdown_stops_the_server_gracefully(self):
        windows = _FakeWindows()
        self._start(windows)
        self.assertTrue(windows.wait_for_launches(1))
        self._stop("SvcShutdown")
        [server] = windows.servers
        self.assertTrue(server.exited.is_set())
        self.assertFalse(server.killed)

    def test_kills_a_server_that_does_not_stop_in_time(self):
        windows = _FakeWindows(server_stops=False)
        self._start(windows, SERVER_STOP_TIMEOUT=0.01)
        self.assertTrue(windows.wait_for_launches(1))
        self._stop()
        [server] = windows.servers
        self.assertTrue(server.killed)

    def test_reports_stop_progress_while_the_server_stops(self):
        windows = _FakeWindows(stop_delay=0.2)
        self._start(windows, STOP_PROGRESS_SECONDS=0.01)
        self.assertTrue(windows.wait_for_launches(1))
        self._stop()
        stop_pending = self.statuses.count(service.win32service.SERVICE_STOP_PENDING)
        self.assertGreater(stop_pending, 1)
        self.assertFalse(windows.servers[0].killed)
