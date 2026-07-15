"""
Utility script for production builds to query Play Store API for version codes.
For dev builds, version is calculated in build.gradle.

Outputs the next version code to stdout for Gradle to read.
"""

from play_store_api import get_latest_version_code

if __name__ == "__main__":
    version_code = get_latest_version_code() + 1
    print(version_code)
