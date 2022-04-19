from __future__ import with_statement

import json
import os
import shutil
import socket
import subprocess
import tempfile
import time
import uuid

import requests
from django.db import connection
from django.db import connections
from django.utils.functional import wraps
from morango.models.core import DatabaseIDModel
from requests.exceptions import RequestException

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


class KolibriServer(object):
    def __init__(
        self,
        autostart=True,
        settings="kolibri.deployment.default.settings.base",
        db_name="default",
        kolibri_home=None,
        seeded_kolibri_home=None,
        env=None,
    ):
        self.env = os.environ.copy()
        self.env["KOLIBRI_HOME"] = kolibri_home or tempfile.mkdtemp()
        self.env["DJANGO_SETTINGS_MODULE"] = settings
        self.env["POSTGRES_DB"] = db_name
        self.env["KOLIBRI_RUN_MODE"] = self.env.get("KOLIBRI_RUN_MODE", "") + "-testing"
        self.env["KOLIBRI_ZIP_CONTENT_PORT"] = str(get_free_tcp_port())
        if env is not None:
            self.env.update(env)
        self.db_path = os.path.join(self.env["KOLIBRI_HOME"], "db.sqlite3")
        self.db_alias = uuid.uuid4().hex
        self.port = get_free_tcp_port()
        self.baseurl = "http://127.0.0.1:{}/".format(self.port)
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
        for i in range(timeout * 2):
            try:
                resp = requests.get(self.baseurl + "api/public/info/", timeout=3)
                if resp.status_code > 0:
                    return
            except RequestException:
                pass
            time.sleep(0.5)

        raise Exception("Server did not start within {} seconds".format(timeout))

    def kill(self):
        try:
            subprocess.Popen("kolibri stop", env=self.env, shell=True)
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
            *extra_args
        )

    def generate_base_data(self):

        self.manage("loaddata", "content_test")
        self.manage("generateuserdata", "--no-onboarding", "--num-content-items", "1")

        facility = Facility.objects.using(self.db_alias).get()
        learner = FacilityUser.objects.using(self.db_alias).filter(
            roles__isnull=True, devicepermissions=None
        )[0]
        staff = FacilityUser.objects.using(self.db_alias).filter(
            roles__isnull=True, devicepermissions=None
        )[0]

        return facility, learner, staff


class multiple_kolibri_servers(object):
    def __init__(self, count=2, **server_kwargs):
        self.server_count = count
        self.server_kwargs = [
            {
                key: value[i] if isinstance(value, (list, tuple)) else value
                for key, value in server_kwargs.items()
            }
            for i in range(self.server_count)
        ]

    def __enter__(self):

        # spin up the servers
        if "sqlite" in connection.vendor:

            tempserver = KolibriServer(
                autostart=False,
                kolibri_home=os.environ.get("KOLIBRI_TEST_PRESEEDED_HOME"),
                **self.server_kwargs[0]
            )
            tempserver.manage("migrate")
            tempserver.delete_model(DatabaseIDModel)
            preseeded_home = tempserver.env["KOLIBRI_HOME"]

            self.servers = [
                KolibriServer(
                    seeded_kolibri_home=preseeded_home, **self.server_kwargs[i]
                )
                for i in range(self.server_count)
            ]

            # calculate the DATABASE settings
            connections.databases = {
                server.db_alias: {
                    "ENGINE": "django.db.backends.sqlite3",
                    "NAME": server.db_path,
                    "OPTIONS": {"timeout": 100},
                }
                for server in self.servers
            }

        if "postgresql" in connection.vendor:

            if self.server_count == 3:
                self.servers = [
                    KolibriServer(
                        settings="kolibri.deployment.default.settings.postgres_test",
                        db_name="eco_test" + str(i + 1),
                        **self.server_kwargs[i]
                    )
                    for i in range(self.server_count)
                ]

            if self.server_count == 5:
                self.servers = [
                    KolibriServer(
                        settings="kolibri.deployment.default.settings.postgres_test",
                        db_name="eco2_test" + str(i + 1),
                        **self.server_kwargs[i]
                    )
                    for i in range(self.server_count)
                ]

            # calculate the DATABASE settings
            connections.databases = {
                server.db_alias: {
                    "ENGINE": "django.db.backends.postgresql",
                    "USER": "postgres",
                    "NAME": server.env["POSTGRES_DB"],
                }
                for server in self.servers
            }

        return self.servers

    def __exit__(self, typ, val, traceback):

        # make sure all the servers are shut down
        for server in self.servers:
            server.kill()

    def __call__(self, f):
        @wraps(f)
        def wrapper(*args, **kwargs):

            assert "servers" not in kwargs

            with self as servers:
                kwargs["servers"] = servers
                return f(*args, **kwargs)

        return wrapper
