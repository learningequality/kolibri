import glob
import json
import os
import re
import shutil


def main():
    try:
        current_dir = os.path.dirname(os.path.realpath(__file__))
        # pathMapping.json maps from the bundle name used in the json message file name
        # to the folder path where built frontend files are stored, per module.
        with open(os.path.join(current_dir, '../kolibri/locale/pathMapping.json'), 'r') as f:
            mapping = json.load(f)
        # Regex to infer language code and module name as group 0 and 1 respectively.
        filename_re = re.compile('([a-zA-Z\-]+)/LC_FRONTEND_MESSAGES/(\S+)-messages.json')
        for file in glob.glob(os.path.join(current_dir, '../kolibri/locale/*/LC_FRONTEND_MESSAGES/*-messages.json')):
            match = filename_re.search(file)
            lang_code = match.groups()[0]
            plugin_name = match.groups()[1]

            # Don't bother copying English files over, as they are the originals.
            if lang_code != "en":
                dir_name = os.path.join(mapping.get(plugin_name), lang_code)

                if not os.path.exists(dir_name):
                    os.makedirs(dir_name)

                print('Copying message file {file} to static folder {dir_name}.'.format(file=file, dir_name=dir_name))
                shutil.copy(file, dir_name)

    except OSError:
        print('No pathMapping.json found.')


if __name__ == "__main__":
    main()
