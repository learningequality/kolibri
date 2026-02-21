"""
Promote published packages from kolibri-proposed to kolibri PPA without rebuilds.

Usage (env):
  LP_CREDENTIALS_FILE=/path/to/creds python3 scripts/ppa_promote.py
"""

import os
import sys
from launchpadlib.launchpad import Launchpad
import lazr.restfulclient.errors as lre


OWNER = "learningequality"
SRC_PPA = "kolibri-proposed"
DST_PPA = "kolibri"
PACKAGE_WHITELIST = {"kolibri-server"}
APP_NAME = "ppa-kolibri-server-jammy-package"


def main():


    lp = Launchpad.login_with(
        application_name=APP_NAME,
        service_root="production",
    )

    owner = lp.people[OWNER]
    source_ppa = owner.getPPAByName(name=SRC_PPA)
    dest_ppa = owner.getPPAByName(name=DST_PPA)

    packages = source_ppa.getPublishedSources(status="Published", order_by_date=True)

    copied_any = False
    for pkg in packages:
        if pkg.source_package_name not in PACKAGE_WHITELIST:
            continue
        try:
            print(
                f"Copying {pkg.source_package_name} {pkg.source_package_version} "
                f"({pkg.distro_series_link}) to {DST_PPA}"
            )
            dest_ppa.copyPackage(
                from_archive=source_ppa,
                include_binaries=True,
                to_pocket=pkg.pocket,
                source_name=pkg.source_package_name,
                version=pkg.source_package_version,
            )
            copied_any = True
        except lre.BadRequest as e:
            if "is obsolete and will not accept new uploads" in str(e):
                print(
                    f"Skip obsolete series for {pkg.source_package_name} {pkg.source_package_version}"
                )
            else:
                raise

    if not copied_any:
        print("No eligible packages to promote.")
    else:
        print("Promotion requests submitted.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
