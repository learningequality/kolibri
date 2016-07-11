import os

import cherrypy
from django.conf import settings
from django.core.management import call_command
from kolibri.deployment.default.wsgi import application


def start():

    # TODO(aronasorman): move to install/plugin-enabling scripts, and remove from here
    call_command("collectstatic", interactive=False)
    call_command("collectstatic_js_reverse", interactive=False)
    call_command("migrate", interactive=False)

    run_server()

def run_server():

    # Mount the application
    cherrypy.tree.graft(application, "/")

    serve_static_dir(settings.STATIC_ROOT, settings.STATIC_URL)
    serve_static_dir(settings.CONTENT_DATABASE_DIR, settings.CONTENT_DATABASE_URL)
    serve_static_dir(settings.CONTENT_STORAGE_DIR, settings.CONTENT_STORAGE_URL)

    # Unsubscribe the default server
    cherrypy.server.unsubscribe()

    # Instantiate a new server object
    server = cherrypy._cpserver.Server()

    # Configure the server object
    server.socket_host = "0.0.0.0"
    server.socket_port = 8080
    server.thread_pool = 30

    # Subscribe this server
    server.subscribe()

    # Start the server engine (Option 1 *and* 2)

    cherrypy.engine.start()
    cherrypy.engine.block()

def serve_static_dir(root, url):

    static_handler = cherrypy.tools.staticdir.handler(
        section="/",
        dir=os.path.split(root)[1],
        root=os.path.abspath(os.path.split(root)[0])
    )
    cherrypy.tree.mount(static_handler, url)
