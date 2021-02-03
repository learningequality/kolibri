import os
import shutil
import subprocess
import sys

kolibri_dir = os.path.abspath(os.path.join('src', 'kolibri'))
win_dir = os.path.abspath(os.path.join('dist', 'win', 'Kolibri'))
kolibri_dest_dir = os.path.join(win_dir, 'kolibri')

def do_build(args):
    try:
        print("Building app...")
        from . import stdlib

        stdlib.generate_stdlib_imports()
        cmd = ['pew', 'build']
        if args and len(args) > 0:
            cmd.extend(args)
        subprocess.call(cmd)
        stdlib.generate_python_bytecode(kolibri_dest_dir)

    except Exception as e:
        raise e
