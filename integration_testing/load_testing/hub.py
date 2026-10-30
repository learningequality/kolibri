import ipaddress
import json
import os
import queue
import re
import secrets
import socket
import sys
import threading
import time
import uuid
from http.server import BaseHTTPRequestHandler
from http.server import ThreadingHTTPServer
from urllib.parse import parse_qs
from urllib.parse import urlparse

THIS_DIR = os.path.dirname(os.path.abspath(__file__))
AGENT_SOURCE = os.path.join(THIS_DIR, "agent.py")
DEFAULT_TOKEN_FILE = os.path.join(THIS_DIR, "generated", "hub_token")
POLL_HOLD_SECONDS = 25
POLL_SLICE_SECONDS = 1
MDNS_HOST = "kolibri-bench.local."  # trailing dot: fully-qualified mDNS name


def detect_lan_ip():
    # A UDP connect() sends no packets; it only picks the outbound interface.
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect(("10.255.255.255", 1))
        return sock.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        sock.close()


def load_token(token_file=DEFAULT_TOKEN_FILE):
    os.makedirs(os.path.dirname(token_file), exist_ok=True)
    try:
        fd = os.open(token_file, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    except FileExistsError:
        with open(token_file) as f:
            return f.read().strip()
    token = secrets.token_hex(16)
    with os.fdopen(fd, "w") as f:
        f.write(token)
    return token


class _Handler(BaseHTTPRequestHandler):
    _hub = None

    def log_message(self, *args):
        pass

    def _json(self, code, payload=None):
        body = json.dumps(payload or {}).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _authed(self):
        token = self.headers.get("X-Bench-Token", "").encode()
        if not secrets.compare_digest(token, self._hub.token.encode()):
            self._json(401, {"error": "bad token"})
            return False
        return True

    def _read_body(self):
        length = int(self.headers.get("Content-Length", 0))
        return json.loads(self.rfile.read(length) or b"{}")

    def _serve_agent(self):
        with open(AGENT_SOURCE) as f:
            src = f.read()
        host = self.headers.get("Host") or self._hub.url.split("://", 1)[-1]
        src = src.replace(
            "EMBEDDED_HUB_URL = None",
            "EMBEDDED_HUB_URL = {!r}".format("http://" + host),
            1,
        )
        src = src.replace(
            "EMBEDDED_TOKEN = None",
            f"EMBEDDED_TOKEN = {self._hub.token!r}",
            1,
        )
        body = src.encode()
        self.send_response(200)
        self.send_header("Content-Type", "text/x-python")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _serve_poll(self, query):
        device = parse_qs(query).get("device", [None])[0]
        if device not in self._hub._queues:
            self._json(410, {"error": "unknown device; re-register"})
            return
        command = self._hub.next_command(device)
        if command is None:
            self.send_response(204)
            self.end_headers()
        else:
            self._json(200, command)

    def _serve_artifact(self, path):
        name = os.path.basename(path)
        artifact_path = self._hub._artifacts.get(name)
        if not artifact_path:
            self._json(404, {"error": f"no artifact {name}"})
            return
        self.send_response(200)
        self.send_header("Content-Type", "application/octet-stream")
        self.send_header("Content-Length", str(os.path.getsize(artifact_path)))
        self.end_headers()
        with open(artifact_path, "rb") as f:
            for chunk in iter(lambda: f.read(1 << 20), b""):
                self.wfile.write(chunk)

    def _handle_register(self):
        body = self._read_body()
        body["ip"] = self.client_address[0]
        base = re.sub(r"[^A-Za-z0-9_-]", "-", body.get("hostname", "device"))
        self._json(200, {"device": self._hub.register_device(base, body)})

    def _handle_result(self):
        body = self._read_body()
        event = self._hub._events.get(body["id"])
        if event:
            self._hub._results[body["id"]] = body
            event.set()
        self._json(200)

    def do_GET(self):
        if not self._authed():
            return
        parsed = urlparse(self.path)
        if parsed.path == "/agent.py":
            self._serve_agent()
        elif parsed.path == "/devices":
            self._json(200, self._hub.devices)
        elif parsed.path == "/poll":
            self._serve_poll(parsed.query)
        elif parsed.path.startswith("/artifacts/"):
            self._serve_artifact(parsed.path)
        else:
            self._json(404, {"error": "not found"})

    def do_POST(self):
        if not self._authed():
            return
        parsed = urlparse(self.path)
        try:
            if parsed.path == "/register":
                self._handle_register()
            elif parsed.path == "/result":
                self._handle_result()
            else:
                self._json(404, {"error": "not found"})
        except (ValueError, KeyError) as e:
            self._json(400, {"error": f"bad request: {e}"})


def _make_handler(hub):
    return type("Handler", (_Handler,), {"_hub": hub})


class Hub:
    def __init__(
        self,
        host="0.0.0.0",
        port=8765,
        advertise_host=None,
        token_file=DEFAULT_TOKEN_FILE,
        poll_hold=POLL_HOLD_SECONDS,
        mdns=True,
    ):
        self._host = host
        self._port = port
        self._advertise_host_override = advertise_host
        self._poll_hold = poll_hold
        self._mdns = mdns
        self.token = load_token(token_file)
        self._lock = threading.Lock()
        self._devices = {}
        # Accessed across threads without self._lock: each access is a single
        # dict operation, which CPython performs atomically.
        self._poll_generations = {}
        self._queues = {}
        self._results = {}
        self._events = {}
        self._artifacts = {}

        self._server = None
        self._thread = None
        self._zeroconf = None
        self._zeroconf_info = None
        self._mdns_host = None

    @property
    def _advertised_host(self):
        return self._advertise_host_override or (
            self._host if self._host != "0.0.0.0" else detect_lan_ip()
        )

    @property
    def url(self):
        return f"http://{self._advertised_host}:{self._port}"

    @property
    def devices(self):
        with self._lock:
            return dict(self._devices)

    def register_device(self, base, body):
        with self._lock:
            name = base
            suffix = 1
            while name in self._devices and self._devices[name].get("ip") != body["ip"]:
                suffix += 1
                name = f"{base}-{suffix}"
            self._devices[name] = body
            self._queues.setdefault(name, queue.Queue())
        return name

    def next_command(self, device):
        with self._lock:
            generation = self._poll_generations.get(device, 0) + 1
            self._poll_generations[device] = generation
        commands = self._queues[device]
        deadline = time.monotonic() + self._poll_hold
        while self._poll_generations[device] == generation:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                return None
            try:
                command = commands.get(timeout=min(remaining, POLL_SLICE_SECONDS))
            except queue.Empty:
                continue
            if command["id"] not in self._events:
                continue
            if self._poll_generations[device] != generation:
                commands.put(command)
                return None
            return command
        return None

    def connect_commands(self):
        urls = []
        if self._mdns_host:
            urls.append(f"http://{self._mdns_host}:{self._port}")
        urls.append(self.url)
        return [
            f"curl -sf -H 'X-Bench-Token: {self.token}' {u}/agent.py | python3 -"
            for u in urls
        ]

    def start(self):
        self._server = ThreadingHTTPServer(
            (self._host, self._port), _make_handler(self)
        )
        self._port = self._server.server_address[1]
        self._thread = threading.Thread(target=self._server.serve_forever, daemon=True)
        self._thread.start()
        if self._mdns:
            self._register_mdns()

    def _register_mdns(self):
        host = self._advertised_host
        try:
            address = socket.gethostbyname(host)
            if ipaddress.ip_address(address).is_loopback:
                raise OSError(f"{host} resolves to loopback address {address}")
            from zeroconf import ServiceInfo  # noqa: PLC0415
            from zeroconf import Zeroconf  # noqa: PLC0415

            info = ServiceInfo(
                "_http._tcp.local.",
                "kolibri-bench._http._tcp.local.",
                addresses=[socket.inet_aton(address)],
                port=self._port,
                properties={},
                server=MDNS_HOST,
            )
            zeroconf = Zeroconf()
            try:
                zeroconf.register_service(info)
            except Exception:
                zeroconf.close()
                raise
        except Exception as exc:
            print(  # noqa: T201
                f"mDNS off ({exc}); devices use the IP", file=sys.stderr
            )
            return
        self._zeroconf = zeroconf
        self._zeroconf_info = info
        self._mdns_host = MDNS_HOST.rstrip(".")

    def stop(self):
        if self._zeroconf:
            try:
                self._zeroconf.unregister_service(self._zeroconf_info)
                self._zeroconf.close()
            except Exception:
                pass
        if self._server:
            self._server.shutdown()
            self._server.server_close()

    def publish_artifact(self, name, path):
        self._artifacts[name] = path
        return f"/artifacts/{name}"

    def send_command(self, device, action, params=None, timeout=600):
        if device not in self._queues:
            raise ValueError(
                f"Unknown device '{device}' - not registered with this hub"
            )
        command_id = uuid.uuid4().hex
        event = threading.Event()
        self._events[command_id] = event
        self._queues[device].put(
            {"id": command_id, "action": action, "params": params or {}}
        )
        try:
            if not event.wait(timeout):
                raise TimeoutError(
                    f"Device '{device}' did not answer '{action}' within {timeout}s"
                )
            return self._results.pop(command_id)
        finally:
            self._events.pop(command_id, None)
