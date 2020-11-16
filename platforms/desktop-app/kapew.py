#!/usr/bin/env python

import argparse
import sys

import build_tools.build
import build_tools.codesigning
import build_tools.prep_kolibri_dist


def prep_kolibri_dist(args):
    build_tools.prep_kolibri_dist.update_kolibri(args)


def notarize_mac_build(args):
    build_tools.codesigning.notarize_mac_build()


def codesign_win_build(args):
    build_tools.codesigning.codesign_windows_build()


def build(args):
    build_tools.build.do_build()


def main():
    parser = argparse.ArgumentParser()
    commands = parser.add_subparsers(title='commands', help='Commands to operate on PyEverywhere projects')

    prebuild = commands.add_parser('build', help="Build the Kolibri app.")
    prebuild.set_defaults(func=build)

    notarize = commands.add_parser('notarize-mac', help="Submit Mac build for notarization.")
    notarize.set_defaults(func=notarize_mac_build)

    notarize = commands.add_parser('codesign-win', help="Codesign Windows build.")
    notarize.set_defaults(func=codesign_win_build)

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

    args = parser.parse_args()

    sys.exit(args.func(args))



if __name__ == "__main__":
    main()
