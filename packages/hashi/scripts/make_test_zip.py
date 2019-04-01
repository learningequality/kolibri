import os
import zipfile

script_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(script_dir, ".."))


def make_test_zip():
    zip_file = os.path.join(root_dir, "localstorage_test.zip")
    with zipfile.ZipFile(zip_file, "w") as zip:
        index_file = os.path.join(root_dir, "test", "kzip", "index.html")
        zip.write(index_file, arcname="index.html")

    print("dist/localstorage_test.zip created!")
    print(
        "To test, create a studio channel with this zip, then load it into Kolibri, then view the node multiple times."
    )


if __name__ == "__main__":
    make_test_zip()
