#!/usr/bin/env python

import argparse
import sys

import build_tools.build
import build_tools.codesigning
import build_tools.prep_kolibri_dist


def prep_kolibri_dist(args):
    build_tools.prep_kolibri_dist.update_kolibri()


def notarize_mac_build(args):
    build_tools.codesigning.notarize_mac_build()


def build(args):
    build_tools.build.do_build()


def main():
    parser = argparse.ArgumentParser()
    commands = parser.add_subparsers(title='commands', help='Commands to operate on PyEverywhere projects')

    prebuild = commands.add_parser('build', help="Build the Kolibri app.")
    prebuild.set_defaults(func=build)

    notarize = commands.add_parser('notarize-mac', help="Submit Mac build for notarization.")
    notarize.set_defaults(func=notarize_mac_build)

    prebuild = commands.add_parser('prep-kolibri-dist', help="Prepare Kolibri for app build.")
    prebuild.set_defaults(func=prep_kolibri_dist)

    args = parser.parse_args()

    sys.exit(args.func(args))



if __name__ == "__main__":
    main()
