#!/usr/bin/env python

import argparse
import os
import subprocess
import sys

import build_tools.build
import build_tools.clean
import build_tools.codesigning
import build_tools.prep_kolibri_dist
import build_tools.version


def prep_kolibri_dist(args, remainder):
    build_tools.prep_kolibri_dist.update_kolibri(args)


def codesign_build(args, remainder):
    if sys.platform.startswith('win'):
        build_tools.build.do_build(remainder)
        build_tools.codesigning.codesign_windows_build()
    else:
        if not os.getenv('MAC_CODESIGN_IDENTITY'):
            print("To do a codesigned build, you must set MAC_CODESIGN_IDENTITY")
            sys.exit(1)
        build_tools.build.do_build(['--sign'])
        print("Uploading Mac build for notarization, this may take a while...")
        build_tools.codesigning.notarize_mac_build()
        print("Once you receive a successful notarization message from Apple, run")
        print("xcrun stapler staple dist/osx/Kolibri.app")
        print("This will attach the notarization to the app. Then, to make the DMG, run")
        print("kapew package")


def build(args, remainder):
    build_tools.build.do_build(remainder)


def clean(args, remainder):
    build_tools.clean.clean(args)


def run(args, remainder):
    cmd = ['pew', 'run']
    cmd.extend(remainder)
    env = build_tools.version.get_env_with_version_set(remainder)
    return subprocess.call(cmd, env=env)


def init(args, remainder):
    cmd = ['pew', 'init']
    cmd.extend(remainder)
    env = build_tools.version.get_env_with_version_set(remainder)
    return subprocess.call(cmd, env=env)


def package(args, remainder):
    cmd = ['pew', 'package']
    cmd.extend(remainder)
    env = build_tools.version.get_env_with_version_set(remainder)
    return subprocess.call(cmd, env=env)


def main():
    parser = argparse.ArgumentParser()
    commands = parser.add_subparsers(title='commands', help='Commands to operate on PyEverywhere projects')

    build_cmd = commands.add_parser('build', help="Build the Kolibri app.")
    build_cmd.set_defaults(func=build)

    clean_cmd = commands.add_parser('clean', help="Removes build outputs")
    clean_cmd.add_argument('--full', action="store_true",
                         help='Also remove cached build environment setup (e.g. docker, p4a dists)')
    clean_cmd.set_defaults(func=clean)

    init_cmd = commands.add_parser('init', help="Initialize the build environment.")
    init_cmd.set_defaults(func=init)

    run_cmd = commands.add_parser('run', help="Run the Kolibri app.")
    run_cmd.set_defaults(func=run)

    pkg_cmd = commands.add_parser('package', help="Generate an installer package for the Kolibri app.")
    pkg_cmd.set_defaults(func=package)

    notarize = commands.add_parser('codesign', help="Codesign the latest app build.")
    notarize.set_defaults(func=codesign_build)

    prebuild = commands.add_parser('prep-kolibri-dist', help="Prepare a bundled Kolibri for app build.")
    prebuild.add_argument('--kolibri-version', default=None,
                         help='Specify a particular Kolibri version to bundle.')
    prebuild.add_argument('--custom-whl', action="store_true",
                          help="If set, uses the custom whl file placed in the whl subdirectory of the root.")
    prebuild.add_argument('--exclude-prereleases', action="store_true",
                          help="When checking for the latest Kolibri version, do not include prereleases such as alphas or betas.")
    prebuild.add_argument('--skip-preseed', action="store_true",
                          help="Don't preseed a Kolibri home directory (used to speed up first run of app).")

    prebuild.set_defaults(func=prep_kolibri_dist)

    args, remainder = parser.parse_known_args()
    sys.exit(args.func(args, remainder))




if __name__ == "__main__":
    main()
