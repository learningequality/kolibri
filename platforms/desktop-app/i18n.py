import os
import subprocess


this_dir = os.path.dirname(os.path.abspath(__file__))
locale_dir = os.path.join(this_dir, 'locale')

for root, dirs, files in os.walk(locale_dir):
    for afile in files:
        filename = os.path.join(root, afile)
        basename, ext = os.path.splitext(filename)
        if ext == '.po':
            subprocess.call(['msgfmt', filename, '-o', basename + '.mo'])

print("Compilation complete!")