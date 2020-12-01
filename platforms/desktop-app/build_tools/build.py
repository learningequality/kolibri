import os
import shutil
import subprocess
import sys

kolibri_dir = os.path.abspath(os.path.join('src', 'kolibri'))
win_dir = os.path.abspath(os.path.join('dist', 'win', 'Kolibri'))
kolibri_dest_dir = os.path.join(win_dir, 'kolibri')

def do_build():
    try:
        print("Building app...")
        from . import stdlib

        stdlib.generate_stdlib_imports()
        subprocess.call(['pew', 'build'])
        stdlib.generate_python_bytecode(kolibri_dest_dir)

    except Exception as e:
        raise e
