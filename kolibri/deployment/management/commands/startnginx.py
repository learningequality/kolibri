import logging as logger
import os
import signal
import tempfile
import time

from django.conf import settings
from django.core.management.base import BaseCommand
from django.core.management.base import CommandError

try:
    import subprocess
except ImportError:
    subprocess = None

# from kolibri.utils.conf import OPTIONS

logging = logger.getLogger(__name__)

NGINX_CONF_PATH = "/etc/nginx/sites-enabled/007-kolibri"

context = {
    "kolibri_home": settings.KOLIBRI_HOME,
    # "http_port": OPTIONS["Deployment"]["HTTP_PORT"],
    "http_port": os.environ.get("KOLIBRI_LISTEN_PORT", 8080),
    "static_root": settings.STATIC_ROOT,
    "content_database_dir": settings.CONTENT_DATABASE_DIR,
    "content_storage_dir": settings.CONTENT_STORAGE_DIR,
}

nginx_config = """
log_format timing_combined '$remote_addr - $remote_user [$time_local] '
    '"$request" $status $body_bytes_sent '
    '"$http_referer" "$http_user_agent" $request_time';

access_log /var/log/nginx/timing.log timing_combined;
uwsgi_cache_path %(kolibri_home)s/nginxcache levels=1:2 keys_zone=uwsgi_cache:10m max_size=1g inactive=240h use_temp_path=off;

server {

    listen %(http_port)s;

    location /static {
        alias   %(static_root)s;
    }

    location /content/databases {
        alias   %(content_database_dir)s;
    }

    location /content/storage {
        alias   %(content_storage_dir)s;
    }

    location /favicon.ico {
        alias   %(static_root)s/images/logo.ico;
    }

    location /zipcontent {
        include uwsgi_params;
        uwsgi_pass 127.0.0.1:3135;
        uwsgi_cache uwsgi_cache;
        uwsgi_cache_key $uri;
        uwsgi_ignore_headers X-Accel-Expires Expires Cache-Control Vary Set-Cookie;
        uwsgi_cache_valid any 240h;
    }

    location / {
        include uwsgi_params;
        uwsgi_pass 127.0.0.1:3135;
        error_page 502 = @502;
    }

    location @502 {
        types { }
        default_type "text/html";
        return 502 "
        <BR>
        <H1>Kolibri might be busy - wait a few moments and then reload this page</H1>
        <BR><BR>
        <H2>If kolibri is still busy, get help from the system administrator.</H2>
        <H3>Error code: nginx 502 Bad Gateway</H3>";
    }

}
""" % context

class Command(BaseCommand):
    help = (
        "Starts Kolibri through uWSGI, creates an Nginx config, and restarts Nginx to load it up."
    )

    def handle(self, **options):

        # some platforms (e.g. Android) don't have subprocess, so we need to check and exit if so
        if subprocess is None:
            raise CommandError("This command requires a functioning 'subprocess' module. Aborting...")

        if subprocess.call(["which", "nginx"]) != 0:
            raise CommandError("This command requires Nginx to be installed. Aborting...")

        if subprocess.call(["which", "uwsgi"]) != 0:
            raise CommandError("This command requires uWSGI to be installed. Aborting...")

        # handle interrupts so we can do our cleanup
        signal.signal(signal.SIGINT, self.exit_gracefully)
        signal.signal(signal.SIGTERM, self.exit_gracefully)

        # start things up!
        self.configure_nginx()
        self.start_nginx()
        self.start_uwsgi()

    def configure_nginx(self):
        self.stdout.write(self.style.WARNING('Creating a custom Nginx config pointing to uWSGI...'))
        _, tmp_path = tempfile.mkstemp()
        with open(tmp_path, "w") as f:
            f.write(nginx_config)
        subprocess.call(["sudo", "mv", tmp_path, NGINX_CONF_PATH])

    def start_nginx(self):
        self.nginx_was_already_running = subprocess.call(["service", "nginx", "status"]) == 0
        result = subprocess.call(["sudo", "service", "nginx", "restart"])
        if result != 0:
            raise CommandError("Unable to start nginx.")
        self.stdout.write(self.style.SUCCESS('Successfully started Nginx'))

    def unconfigure_nginx(self):
        self.stdout.write(self.style.WARNING('Deleting the Nginx conf file we created...'))
        subprocess.call(["sudo", "rm", NGINX_CONF_PATH])

    def stop_nginx(self):
        if self.nginx_was_already_running:
            self.stdout.write(self.style.NOTICE('Restarting Nginx...'))
            subprocess.call(["sudo", "service", "nginx", "restart"])
        else:
            self.stdout.write(self.style.NOTICE('Stopping Nginx...'))
            subprocess.call(["sudo", "service", "nginx", "stop"])

    def start_uwsgi(self):
        self.stdout.write(self.style.WARNING('Starting uWSGI; try loading http://127.0.0.1:{port}/ shortly!'
                                             .format(port=context["http_port"])))
        self.stdout.write(self.style.WARNING('(press CTRL-C to exit, when you wish to shut down the server)'))
        ini_path = os.path.join(os.path.dirname(os.path.realpath(__file__)), "..", "..", "default", "uwsgi.ini")
        subprocess.call(["uwsgi", ini_path])

    def exit_gracefully(self, *args, **kwargs):
        self.stdout.write(self.style.NOTICE('Received interrupt! Cleaning up and exiting...'))
        time.sleep(1)
        self.unconfigure_nginx()
        self.stop_nginx()
