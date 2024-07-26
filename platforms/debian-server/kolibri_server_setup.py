#!/usr/bin/python3
import argparse
import os
import subprocess

import kolibri.utils.pskolibri as psutil

from kolibri.core.content.utils.paths import get_content_dir_path
from kolibri.core.utils.cache import RedisSettingsHelper
from kolibri.core.utils.cache import process_cache
from kolibri.utils.options import update_options_file
from kolibri.utils.conf import OPTIONS
from kolibri.utils.conf import KOLIBRI_HOME

# read the config file options
port = OPTIONS["Deployment"]["HTTP_PORT"]
zip_content_port = OPTIONS["Deployment"]["ZIP_CONTENT_PORT"]
path_prefix = OPTIONS["Deployment"]["URL_PATH_PREFIX"]
redis_db = OPTIONS["Cache"]["CACHE_REDIS_DB"]
listen_address = OPTIONS["Deployment"]["LISTEN_ADDRESS"]

if path_prefix != "/":
    path_prefix = "/" + path_prefix


def start_debconf_dialog():
    """
    Auxiliar function to start a dialog with debconf database
    """
    args = ["debconf-communicate", "-fnoninteractive", "kolibri-server"]
    dccomm = subprocess.Popen(
        args,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        close_fds=True,
        universal_newlines=True,
    )
    return dccomm


def stop_debconf_dialog(dccomm):
    """
    Auxiliar function to end a dialog with debconf database
    """
    dccomm.stdin.write("STOP\n")
    dccomm.stdin.flush()


def set_debconf_ports(port, zip_content_port):
    """
    Sets the port kolibri uses in debconf database, to be used by future
    reconfigurations or upgrades of the kolibri-server package
    """
    dccomm = start_debconf_dialog()
    dccomm.stdin.write("SET kolibri-server/port {}\n".format(port))
    dccomm.stdin.write("SET kolibri-server/zip_content_port {}\n".format(zip_content_port))
    dccomm.stdin.flush()
    stop_debconf_dialog(dccomm)


def set_port(port):
    """
    Modify Kolibri options to set the TCP port the server will listen on
    """
    update_options_file("Deployment", "HTTP_PORT", port)

def set_zip_content_port(port):
    """
    Modify Kolibri options to set the TCP port the hashi files will be served on
    """
    update_options_file("Deployment", "ZIP_CONTENT_PORT", port)

def delete_redis_cache():
    """
    Delete previous cache in redis to reset it when the service starts.
    The purpose is avoiding redis memory usage growing infinitely.
    """
    redis_args = [
        (str(redis_db), ":1:views.decorators.*"),
        (str(redis_db), ":1:CHANNEL_STATS_CACHED_KEYS*"),
        (str(redis_db), ":1:*_dataset"),
        (str(redis_db), ":1:content_cache_key"),
        (str(redis_db), ":1:device_settings_cache_key"),
        (str(redis_db + 1), "built_files:1:*"),
    ]

    for arg in redis_args:
        search = ["redis-cli", "-n", arg[0], "--scan", "--pattern", arg[1]]
        delete = ["xargs", "--no-run-if-empty", "redis-cli", "-n", arg[0], "unlink"]
        exe_search = subprocess.Popen(search, stdout=subprocess.PIPE)
        subprocess.Popen(delete, stdin=exe_search.stdout)


def enable_redis_cache():
    """
    Set redis as the cache backend.
    When multiple processes run the server we need to use
    redis to ensure the cache is shared among them.
    It also limits redis memory usage to avoid server problems
    if the cache grows too much
    """
    update_options_file("Cache", "CACHE_BACKEND", "redis")
    update_options_file("Cache", "CACHE_REDIS_MAXMEMORY_POLICY", "allkeys-lru")

    delete_redis_cache()
    server_memory = psutil.virtual_memory().total
    max_memory = round(server_memory / 10)
    if hasattr(process_cache, "get_master_client"):
        helper = RedisSettingsHelper(process_cache.get_master_client())
        redis_memory = helper.get_used_memory()
        if max_memory < redis_memory:
            max_memory = redis_memory + 2000

    update_options_file("Cache", "CACHE_REDIS_MAXMEMORY", max_memory)


def disable_redis_cache():
    """
    Set memory as the cache backend .
    If redis is not active, enabling it will break kolibri
    """
    update_options_file("Cache", "CACHE_BACKEND", "memory")


def check_redis_service():
    """
    Checks if redis is running in the system
    """
    status = False
    args = ["service", "redis", "status"]
    try:
        subprocess.check_call(args, stdout=subprocess.PIPE)
    except subprocess.CalledProcessError:
        pass  # redis is not running
    except FileNotFoundError:
        pass  # 'service' is not an available command
    else:
        status = True
    return status


def save_nginx_conf_port(port, zip_port, listen_address="0.0.0.0", nginx_conf=None):
    """
     Adds the port for nginx to run to an existing config file.
    """

    if nginx_conf is None:
        nginx_conf = os.path.join(KOLIBRI_HOME, "nginx.conf")

    if listen_address != "0.0.0.0":
        address_port = "{}:{}".format(listen_address, port)
        address_zip_port = "{}:{}".format(listen_address, zip_port)
    else:
        address_port = port
        address_zip_port = zip_port

    configuration = (
        "# This file is maintained AUTOMATICALLY and will be overwritten\n"
        "#\n"
        "# Do not edit this file. If you are using the kolibri-server"
        "package,\n"
        "# please write custom configurations in /etc/kolibri/nginx.d/\n"
        "\n"
        "server{{\n"
        "  listen {port};\n"
        "  location {path_prefix}favicon.ico {{\n"
        "    empty_gif;\n"
        "  }}\n\n"
        "  location {path_prefix} {{\n"
        "    include uwsgi_params;\n"
        "    uwsgi_pass unix:///tmp/kolibri_uwsgi.sock;\n"
        "    proxy_ignore_headers Vary;\n"
        "  }}\n\n"
        "  error_page 502 = @error502;\n"
        "  location @error502 {{\n"
        "    ssi on;\n"
        "    internal;\n"
        "    root /usr/share/kolibri/error_pages;\n"
        "    rewrite ^(.*)$ $error502 break;\n"
        "  }}\n"
        "}}\n"
        "\n"
        "server{{\n"
        "  listen {zip_port};\n"
        "  location {path_prefix} {{\n"
        "    include uwsgi_params;\n"
        "    uwsgi_pass unix:///tmp/kolibri_hashi_uwsgi.sock;\n"
        "  }}\n"
        "}}\n"
    ).format(port=address_port, path_prefix=path_prefix, zip_port=address_zip_port)

    with open(nginx_conf, "w") as nginx_conf_file:
        nginx_conf_file.write(configuration)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Tool to configure kolibri-server")
    parser.add_argument(
        "-d",
        "--debconfport",
        required=False,
        default="",
        help="Initial port to be used when installing/reconfiguring kolibri-server package",
    )
    parser.add_argument(
        "-z",
        "--debconfzipport",
        required=False,
        default="",
        help="Port to run hashi iframes used when installing/reconfiguring kolibri-server package",
    )
    args = parser.parse_args()
    if (
        args.debconfport
    ):  # To be executed only when installing/reconfiguring the Debian package
        set_port(args.debconfport)
        if args.debconfzipport:
            set_zip_content_port(args.debconfzipport)

    else:
        if check_redis_service():
            enable_redis_cache()
        else:
            disable_redis_cache()
        save_nginx_conf_port(port, zip_content_port, listen_address)
        # Let's update debconf, just in case the user has changed the port in options.ini:
        set_debconf_ports(port, zip_content_port)
