import os
import shutil
import subprocess

this_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(this_dir, '..'))


def clean(args):
    kolibri_dir = os.path.join(project_root, 'src', 'kolibri')
    dist_dir = os.path.join(project_root, 'dist')
    build_dir = os.path.join(project_root, 'build')
    to_clean = [build_dir, kolibri_dir, dist_dir]

    if args.full:
        to_clean.append(os.path.join(project_root, 'build_docker'))
        try:
            # these steps aren't needed for all cases, so failure should not be
            # fatal.
            subprocess.call(['python-for-android', 'clean_dists'])
            subprocess.call('yes y | docker system prune -a || true', shell=True)
        except:
            print("Attempts to clean Docker and Android build outputs failed.")

    for path in to_clean:
        if os.path.isdir(path):
            shutil.rmtree(path)
        elif os.path.isfile(path):
            os.remove(path)
