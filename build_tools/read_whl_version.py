import sys

from pkginfo import Wheel

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: read_whl_version.py <whl_file>")  # noqa: T201
        sys.exit(1)

    whl_file = sys.argv[1]
    whl = Wheel(whl_file)
    print(whl.version)  # noqa: T201
    sys.exit(0)
