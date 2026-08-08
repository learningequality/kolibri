import atexit
import json
import os
import shutil
import socket
import subprocess
import tempfile
import time
import uuid

import requests
from django.conf import settings
from django.db import connection
from django.db import connections
from django.utils.functional import wraps
from morango.models.core import DatabaseIDModel
from requests.exceptions import RequestException

from kolibri.core.auth.constants import role_kinds
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser

# custom Morango instance info used in tests
CUSTOM_INSTANCE_INFO = {"kolibri": "0.14.7"}


def get_free_tcp_port():
    tcp = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    tcp.bind(("", 0))
    addr, port = tcp.getsockname()
    tcp.close()
    return port


class KolibriServer:
    def __init__(
        self,
        autostart=True,
        settings="kolibri.deployment.default.settings.integration_test_server",
        db_name=None,
        kolibri_home=None,
        seeded_kolibri_home=None,
        env=None,
        enable_automatic_download=False,
    ):
        self.env = os.environ.copy()
        self.env["KOLIBRI_HOME"] = kolibri_home or tempfile.mkdtemp()
        self.env["DJANGO_SETTINGS_MODULE"] = settings
        if db_name is not None:
            self.env["KOLIBRI_DATABASE_NAME"] = db_name
        self.env["KOLIBRI_RUN_MODE"] = self.env.get("KOLIBRI_RUN_MODE", "") + "-testing"
        self.env["KOLIBRI_ZIP_CONTENT_PORT"] = str(get_free_tcp_port())
        if env is not None:
            self.env.update(env)
        self.db_path = os.path.join(self.env["KOLIBRI_HOME"], "db.sqlite3")
        self.db_alias = uuid.uuid4().hex
        self.port = get_free_tcp_port()
        self.baseurl = "http://127.0.0.1:{}/".format(self.port)
        self.enable_automatic_download = enable_automatic_download
        self._instance = None
        if seeded_kolibri_home is not None:
            shutil.rmtree(self.env["KOLIBRI_HOME"])
            shutil.copytree(seeded_kolibri_home, self.env["KOLIBRI_HOME"])
        if autostart:
            self.start()

    def start(self):
        self._instance = subprocess.Popen(
            ["kolibri", "start", "--port", str(self.port), "--foreground"],
            env=self.env,
        )
        self._wait_for_server_start()
        if not self.enable_automatic_download:
            self.manage("devicesettings", "set", "--disable-automatic-download")

    def manage(self, *args):
        subprocess.call(
            ["kolibri", "manage"] + list(args),
            env=self.env,
        )

    def create_model(self, model, **kwargs):
        kwarg_text = json.dumps(kwargs, default=str)
        self.pipe_shell(
            'import json; from {module_path} import {model_name}; kwargs = json.loads("""{}"""); {model_name}.objects.create(**kwargs)'.format(
                kwarg_text, module_path=model.__module__, model_name=model.__name__
            )
        )

    def update_model(self, model, pk, **kwargs):
        kwarg_text = json.dumps(kwargs, default=str)
        self.pipe_shell(
            'import json; from {module_path} import {model_nm}; kwargs = json.loads("""{}"""); {model_nm}.objects.filter(pk="{pk}").update(**kwargs)'.format(
                kwarg_text,
                module_path=model.__module__,
                model_nm=model.__name__,
                pk=pk,
            )
        )

    def delete_model(self, model, **kwargs):
        kwarg_text = json.dumps(kwargs, default=str)
        self.pipe_shell(
            'import json; from {module_path} import {model_name}; kwargs = json.loads("""{}"""); obj = {model_name}.objects.get(**kwargs); obj.delete()'.format(
                kwarg_text, module_path=model.__module__, model_name=model.__name__
            )
        )

    def change_password(self, user, password):
        self.pipe_shell(
            'from kolibri.core.auth.models import *; user = FacilityUser.objects.get(id="{user}"); user.set_password("{password}"); user.save()'.format(
                user=user.id if isinstance(user, FacilityUser) else user,
                password=password,
            )
        )

    def pipe_shell(self, text):
        subprocess.call(
            "echo '{}' | kolibri shell".format(text), env=self.env, shell=True
        )

    def _wait_for_server_start(self, timeout=20):
        # At a 0.5s interval each of the suite's dozens of server starts waits a
        # quarter second on average after the server is already up.
        for i in range(timeout * 10):
            try:
                resp = requests.get(self.baseurl + "api/public/info/", timeout=3)
                if resp.status_code > 0:
                    return
            except RequestException:
                pass
            time.sleep(0.1)

        raise Exception("Server did not start within {} seconds".format(timeout))

    def kill(self):
        try:
            subprocess.Popen("kolibri stop", env=self.env, shell=True)
            if self._instance is not None:
                self._instance.kill()
            shutil.rmtree(self.env["KOLIBRI_HOME"])
        except OSError:
            pass

    def sync(
        self, server, facility, user=None, username="superuser", password="password"
    ):
        """
        Perform a sync from this device to another server. If `user` is provided, perform
        a single-user sync. If credentials are needed, include `username` and `password`.
        """

        extra_args = ["--noninteractive"]

        if user:
            extra_args += [
                "--user",
                user.id if isinstance(user, FacilityUser) else user,
            ]

        if username and password:
            extra_args += [
                "--username",
                username,
                "--password",
                password,
            ]

        self.manage(
            "sync",
            "--baseurl",
            server.baseurl,
            "--facility",
            facility.id if isinstance(facility, Facility) else facility,
            *extra_args,
        )

    def generate_base_data(self):
        self.manage("loaddata", "content_test")
        self.manage("generateuserdata", "--no-onboarding", "--num-content-items", "1")

        facility = Facility.objects.using(self.db_alias).get()
        learner = FacilityUser.objects.using(self.db_alias).filter(
            roles__isnull=True, devicepermissions=None
        )[0]
        staff = FacilityUser.objects.using(self.db_alias).filter(
            roles__kind=role_kinds.COACH, devicepermissions=None
        )[0]

        return facility, learner, staff


# A migrated KOLIBRI_HOME depends only on the kwargs it was built with, and is
# never written to afterwards — servers copy out of it. Build one per distinct
# set of kwargs and reuse it, rather than paying a full migration per test.
_preseeded_homes = {}


def _get_preseeded_home(server_kwargs):
    # A None kwarg means "use the default", so it cannot change the home built:
    # keying on it would build a second identical one.
    significant = {k: v for k, v in server_kwargs.items() if v is not None}
    key = json.dumps(significant, sort_keys=True, default=repr)
    if key not in _preseeded_homes:
        override = os.environ.get("KOLIBRI_TEST_PRESEEDED_HOME")
        tempserver = KolibriServer(
            autostart=False, kolibri_home=override, **server_kwargs
        )
        tempserver.manage("migrate")
        # Migrating creates a database ID. Every server copied from this home
        # has to generate its own, or they all sync as the same instance.
        tempserver.delete_model(DatabaseIDModel)
        home = tempserver.env["KOLIBRI_HOME"]
        if override is None:
            atexit.register(shutil.rmtree, home, ignore_errors=True)
        _preseeded_homes[key] = home
    return _preseeded_homes[key]


class multiple_kolibri_servers:
    def __init__(self, count=2, **server_kwargs):
        self.server_count = count
        self.servers = []
        self.server_kwargs = [
            {
                key: value[i] if isinstance(value, (list, tuple)) else value
                for key, value in server_kwargs.items()
            }
            for i in range(self.server_count)
        ]

    def __enter__(self):
        try:
            self._start_servers()
        except BaseException:
            # Servers left running hold connections that stop every later test
            # creating its own database. BaseException: Django exits rather than
            # raises when it cannot clobber one.
            self.__exit__(None, None, None)
            raise
        return self.servers

    def _start_servers(self):
        # the same instance is reused for every invocation, so start from scratch
        self.servers = []
        # spin up the servers
        if "sqlite" in connection.vendor:
            preseeded_home = _get_preseeded_home(self.server_kwargs[0])

            for i in range(self.server_count):
                # track before starting, so a failed start is still shut down
                server = KolibriServer(
                    autostart=False,
                    seeded_kolibri_home=preseeded_home,
                    **self.server_kwargs[i],
                )
                self.servers.append(server)
                server.start()

            # calculate the DATABASE settings
            for server in self.servers:
                settings.DATABASES[server.db_alias] = connections.databases[
                    server.db_alias
                ] = {
                    "ENGINE": "django.db.backends.sqlite3",
                    "NAME": server.db_path,
                    "OPTIONS": {"timeout": 100},
                }

        if "postgresql" in connection.vendor:
            self.servers = [
                KolibriServer(
                    autostart=False,
                    db_name="eco_test" + str(i + 1),
                    **self.server_kwargs[i],
                )
                for i in range(self.server_count)
            ]

            # calculate the DATABASE settings
            for server in self.servers:
                settings.DATABASES[server.db_alias] = connections.databases[
                    server.db_alias
                ] = {
                    "ENGINE": "django.db.backends.postgresql",
                    "USER": "postgres",
                    "PASSWORD": "postgres",
                    "NAME": server.env["KOLIBRI_DATABASE_NAME"],
                    "HOST": server.env["KOLIBRI_DATABASE_HOST"],
                    "PORT": server.env["KOLIBRI_DATABASE_PORT"],
                    "TEST": {"NAME": server.env["KOLIBRI_DATABASE_NAME"]},
                }

            for server in self.servers:
                server_conn = connections[server.db_alias]
                # We don't use `create_test_db` here but instead the internal method which does the
                # magic we want, since `create_test_db` also attempts to sync and migrate the
                # database and that raises errors. When the Kolibri server starts it will run
                # migrations automatically
                server_conn.creation._create_test_db(verbosity=2, autoclobber=True)
                server_conn.close()
                server.start()

    def __exit__(self, typ, val, traceback):
        # kill every server before touching any database, so that a database that
        # refuses to drop cannot abort the loop and leave later servers running
        for server in self.servers:
            server.kill()
        for server in self.servers:
            # a server abandoned before its alias was registered has no database
            if server.db_alias not in connections.databases:
                continue
            # destroy the test databases
            server_conn = connections[server.db_alias]
            try:
                server_conn.creation.destroy_test_db()
            except Exception:
                # Nothing narrower will do: Django surfaces a missing database
                # as a RuntimeError from _nodb_cursor.
                pass
            server_conn.close()
            # Remove the database alias from settings to prevent subsequent tests
            # from trying to access databases that no longer exist
            if server.db_alias in settings.DATABASES:
                del settings.DATABASES[server.db_alias]
            if server.db_alias in connections.databases:
                del connections.databases[server.db_alias]

    def __call__(self, f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            assert "servers" not in kwargs

            with self as servers:
                kwargs["servers"] = servers
                return f(*args, **kwargs)

        return wrapper
