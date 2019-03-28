"""
This module defines a function for customizing the requirements used at Kolibri build time
and hence bundled into the dist folder.

For more detail see the documentation in __init__.py
"""
import os
import tempfile

import requests


def add_requirements_to_base():
    if "EXTRA_REQUIREMENTS" in os.environ and os.environ["EXTRA_REQUIREMENTS"]:
        file_path = os.environ["EXTRA_REQUIREMENTS"]
        # We have been passed a URL, not a local file path
        if file_path.startswith("http"):
            print(
                "Downloading extra requirements from {file_path}".format(
                    file_path=file_path
                )
            )
            _, path = tempfile.mkstemp(suffix=".txt", text=True)
            with open(path, "w") as f:
                r = requests.get(file_path)
                f.write(r.content)
            file_path = path
        try:
            with open(file_path, "r") as f:
                requirements = [
                    requirement.strip()
                    for requirement in f.readlines()
                    if requirement.strip()
                ]
            if requirements:
                with open(
                    os.path.join(os.path.dirname(__file__), "../requirements.txt"), "a"
                ) as f:
                    f.writelines(requirements)
        except IOError:
            pass


if __name__ == "__main__":
    add_requirements_to_base()
