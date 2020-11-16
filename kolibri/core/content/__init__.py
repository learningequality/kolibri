import mimetypes
import os


default_app_config = "kolibri.core.content.apps.KolibriContentConfig"


# Do this to prevent import of broken Windows filetype registry that makes guesstype not work.
# https://www.thecodingforums.com/threads/mimetypes-guess_type-broken-in-windows-on-py2-7-and-python-3-x.952693/
mimetypes.init([os.path.join(os.path.dirname(__file__), "constants", "mime.types")])
