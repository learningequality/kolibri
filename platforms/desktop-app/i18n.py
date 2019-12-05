import io
import os
import shutil
import subprocess
import sys
import zipfile

import requests

this_dir = os.path.dirname(os.path.abspath(__file__))
locale_dir = os.path.join(this_dir, 'locale')

msgfmt_path = '/Library/Frameworks/Python.framework/Versions/3.6/share/doc/python3.6/examples/Tools/i18n/msgfmt.py'

if 'update' in sys.argv:
    key = os.environ['CROWDIN_API_KEY']
    crowdin_url = 'https://api.crowdin.com/api/project/kolibri-mac-app/download/all.zip?key={}'.format(key)

    trans_dir = os.path.abspath('crowdin_files')

    os.makedirs(trans_dir, exist_ok=True)

    print(crowdin_url)
    r = requests.get(crowdin_url)
    z = zipfile.ZipFile(io.BytesIO(r.content))
    z.extractall(path=trans_dir)

    print("Extracting zipfile contents and copying files to destination directories...")

    for root, dirs, files in os.walk(trans_dir):
        lang_subdir = root.replace(trans_dir + os.sep, '')
        messages_dir = os.path.abspath(os.path.join('locale', lang_subdir, 'LC_MESSAGES'))
        os.makedirs(messages_dir, exist_ok=True)
        for afile in files:
            basename, ext = os.path.splitext(afile)
            if afile.endswith('.po'):
                basename = basename.split('-')[0]
                shutil.copy(os.path.join(root, afile), os.path.join(messages_dir, basename + ext))
            if afile.endswith('.html'):
                basename = basename + '-{}'.format(lang_subdir.replace('-', '_'))
                output_filename = basename + ext
                output_dir = os.path.abspath('assets')
                shutil.copy(os.path.join(root, afile), os.path.join(output_dir, output_filename))

    shutil.rmtree(trans_dir)

# always compile when we run the script.
print("Compiling translation files...")

for root, dirs, files in os.walk(locale_dir):
    for afile in files:
        filename = os.path.join(root, afile)
        basename, ext = os.path.splitext(filename)
        if ext == '.po':
            subprocess.call([msgfmt_path, filename])

print("Compilation complete!")
