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
        # these steps aren't needed for all cases, so failure should not be
        # fatal. We'll just note the failure so users are aware.
        if subprocess.call(['python-for-android', 'clean_dists']) != 0:
            print("Attempt to clean Android dist failed. Can be ignored if not building for Android.")
        else:
            print("Android build files removed.")
        if subprocess.call('yes y | docker system prune -a', shell=True, stdout=subprocess.DEVNULL) != 0:
            print("Attempt to clean Docker build files failed. Can be ignored if not building using Docker.")
        else:
            print("Docker build files removed.")

    for path in to_clean:
        print("Removing {}".format(path))
        if os.path.isdir(path):
            shutil.rmtree(path)
        elif os.path.isfile(path):
            os.remove(path)
