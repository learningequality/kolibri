import json
import os
import queue
import re
import secrets
import socket
import sys
import threading
import uuid
from http.server import BaseHTTPRequestHandler
from http.server import ThreadingHTTPServer
from urllib.parse import parse_qs
from urllib.parse import urlparse

THIS_DIR = os.path.dirname(os.path.abspath(__file__))
AGENT_SOURCE = os.path.join(THIS_DIR, "agent.py")
DEFAULT_TOKEN_FILE = os.path.join(THIS_DIR, "generated", "hub_token")
POLL_HOLD_SECONDS = 25
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
    if os.path.exists(token_file):
        with open(token_file) as f:
            return f.read().strip()
    token = secrets.token_urlsafe(16)
    os.makedirs(os.path.dirname(token_file), exist_ok=True)
    with open(token_file, "w") as f:
        f.write(token)
    os.chmod(token_file, 0o600)
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
        try:
            command = self._hub._queues[device].get(timeout=self._hub._poll_hold)
            self._json(200, command)
        except queue.Empty:
            self.send_response(204)
            self.end_headers()

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
        name = self._hub.claim_device_name(base, body["ip"])
        self._hub.devices[name] = body
        self._hub._queues.setdefault(name, queue.Queue())
        self._json(200, {"device": name})

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
    ):
        self._host = host
        self._port = port
        self._advertise_host = advertise_host
        self._poll_hold = poll_hold
        self.token = load_token(token_file)
        # Shared across threads without a lock: one writer per key, and
        # CPython dict operations are atomic.
        self.devices = {}
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
    def url(self):
        host = self._advertise_host or (
            self._host if self._host != "0.0.0.0" else detect_lan_ip()
        )
        return f"http://{host}:{self._port}"

    def claim_device_name(self, base, ip):
        candidate = base
        suffix = 1
        while candidate in self.devices and self.devices[candidate].get("ip") != ip:
            suffix += 1
            candidate = f"{base}-{suffix}"
        return candidate

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
        self._register_mdns()

    def _register_mdns(self):
        ip = self._advertise_host or (
            self._host if self._host != "0.0.0.0" else detect_lan_ip()
        )
        try:
            from zeroconf import ServiceInfo  # noqa: PLC0415
            from zeroconf import Zeroconf  # noqa: PLC0415

            info = ServiceInfo(
                "_http._tcp.local.",
                "kolibri-bench._http._tcp.local.",
                addresses=[socket.inet_aton(ip)],
                port=self._port,
                properties={},
                server=MDNS_HOST,
            )
            zeroconf = Zeroconf()
            zeroconf.register_service(info)
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
        return f"{self.url}/artifacts/{name}"

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
