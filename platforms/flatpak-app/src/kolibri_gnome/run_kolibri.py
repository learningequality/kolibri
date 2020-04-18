#!/usr/bin/python3

import argparse


def main():
    parser = argparse.ArgumentParser()
    subcommands = parser.add_subparsers(dest='subcommand', required=False)

    desktop_parser = subcommands.add_parser('desktop')
    desktop_parser.add_argument('path', nargs='?', type=str, default='/')

    service_parser = subcommands.add_parser('service')

    options = parser.parse_args()

    if options.subcommand is None or options.subcommand == 'desktop':
        from .run_kolibri_desktop import kolibri_desktop_main
        path = getattr(options, 'path', None)
        return kolibri_desktop_main(path)
    elif options.subcommand == 'service':
        from .run_kolibri_service import kolibri_service_main
        return kolibri_service_main()
    else:
        print("Error: Invalid subcommand")
        return 1


if __name__== "__main__":
    exitcode = main()
    sys.exit(exitcode)
