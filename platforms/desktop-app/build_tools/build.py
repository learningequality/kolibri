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

        if sys.platform.startswith('win'):
            print("Copying kolibri package dir...")
            if os.path.exists(kolibri_dest_dir):
                shutil.rmtree(kolibri_dest_dir)

            print("Moving dist folders into project root...")
            shutil.copytree(kolibri_dir, kolibri_dest_dir)
            dest_dist_dir = os.path.join(kolibri_dest_dir, 'dist')
            for root, dirs, files in os.walk(dest_dist_dir):
                for adir in dirs:
                    pkg_dir = os.path.join(win_dir, adir)
                    if os.path.exists(pkg_dir):
                        shutil.rmtree(pkg_dir)
                    os.rename(os.path.join(root, adir), pkg_dir)

            print("Copying distutils...")
            import distutils
            # distutils in virtualenvs is just the __init__.py that redirects to the system module. We import
            # a submodule to make sure we get the real location.
            distutils_dir = os.path.dirname(os.path.dirname(distutils.command.__file__))
            shutil.copytree(distutils_dir, os.path.join(win_dir, 'distutils'))

    except Exception as e:
        raise e
