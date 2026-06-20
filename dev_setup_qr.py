# flake8: noqa: T201
"""
One-shot helper that provisions (idempotently) a dev facility with QR login
enabled and three test learners. Invoked by dev-qr-start.ps1 via
`kolibri manage shell < dev_setup_qr.py` so it runs inside the Django ORM.

Override the facility name by setting the KOLIBRI_DEV_FACILITY env var.
"""
import os

from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.utils.qr_tokens import assign_qr_login_token

FACILITY_NAME = os.environ.get("KOLIBRI_DEV_FACILITY", "QR Test Facility")
ADMIN_USERNAME = os.environ.get("KOLIBRI_DEV_ADMIN_USER", "a")
ADMIN_PASSWORD = os.environ.get("KOLIBRI_DEV_ADMIN_PASS", "a")


def _banner(msg):
    print("=" * 60)
    print(msg)
    print("=" * 60)


def _provision_or_reuse_facility():
    facility = Facility.objects.filter(name=FACILITY_NAME).first()
    if facility is not None:
        print(f"[skip] Facility '{FACILITY_NAME}' already exists (id={facility.id})")
        return facility

    from kolibri.core.device.utils import provision_device

    facility = provision_device(
        facility_name=FACILITY_NAME,
        preset="informal",
        superuser_username=ADMIN_USERNAME,
        superuser_password=ADMIN_PASSWORD,
        language_id="en",
    )
    print(f"[ok]   Provisioned facility '{FACILITY_NAME}' (id={facility.id})")
    return facility


def _enable_qr_login(facility):
    dataset = facility.dataset
    if dataset.enable_qr_login:
        print("[skip] QR login already enabled on facility")
    else:
        dataset.enable_qr_login = True
        dataset.save()
        print("[ok]   Enabled QR login on facility")


def _create_test_learners(facility):
    for i in range(1, 4):
        username = "learner{i}".format(i=i)
        learner, created = FacilityUser.objects.get_or_create(
            username=username,
            facility=facility,
            defaults={"full_name": "Learner {i}".format(i=i)},
        )
        if created:
            learner.set_password("pass")
            learner.save()
            print("[ok]   Created learner '{u}'".format(u=username))

        if learner.qr_login_token is None:
            assign_qr_login_token(learner)
            print(
                "[ok]   QR token for '{u}': {t}".format(
                    u=username, t=learner.qr_login_token
                )
            )
        else:
            print(
                "[skip] Learner '{u}' already has QR token: {t}".format(
                    u=username, t=learner.qr_login_token
                )
            )


if __name__ == "__main__":
    _banner("Kolibri QR Login — dev provisioning")
    facility = _provision_or_reuse_facility()
    _enable_qr_login(facility)
    _create_test_learners(facility)

    _banner("Credentials")
    print("Admin:    {u} / {p}".format(u=ADMIN_USERNAME, p=ADMIN_PASSWORD))
    print("Learners: learner1 / learner2 / learner3  (password: pass)")
    print("          See QR tokens above; encode them at")
    print("          https://api.qrserver.com/v1/create-qr-code/?data=<TOKEN>")
    _banner("Done")
