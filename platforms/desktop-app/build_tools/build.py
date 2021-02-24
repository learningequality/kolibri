import os
import subprocess
import sys

kolibri_dir = os.path.abspath(os.path.join('src', 'kolibri'))
win_dir = os.path.abspath(os.path.join('dist', 'win', 'Kolibri'))
kolibri_dest_dir = os.path.join(win_dir, 'kolibri')

from .version import get_env_with_version_set


def do_build(args):
    if 'android' in args and '--docker' in args:
        subprocess.call(['docker', 'build', '-t', 'android_kolibri', '.'])
        subprocess.call(['docker/android/rundocker.sh'])
        return
    elif '--docker' in args:
        print("Docker builds not supported for this platform.")
        print("Attempting non-docker build...")

    try:
        print("Building app...")
        from . import stdlib

        # see function docstring for more info on why we do this.
        stdlib.generate_stdlib_imports()

        env = get_env_with_version_set(args)

        # This is needed to avoid errors when scanning python
        # code for dependencies.
        if sys.platform.startswith('darwin'):
            env['PYTHONPATH'] = os.path.join(kolibri_dir, 'dist')

        cmd = ['pew', 'build']
        if args and len(args) > 0:
            cmd.extend(args)
        subprocess.call(cmd, env=env)
        if sys.platform.startswith('win'):
            stdlib.generate_python_bytecode(kolibri_dest_dir)

    except Exception as e:
        raise e
