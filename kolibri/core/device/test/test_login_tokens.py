import subprocess
import sys
import unittest

from kolibri.core.device.login_tokens import LoginTokenStore
from kolibri.core.device.login_tokens import OSUserInfo

ADMIN = OSUserInfo(
    os_user_id="admin", account_name="admin", full_name="Ada Admin", is_superuser=True
)
LEARNER = OSUserInfo(
    os_user_id="learner",
    account_name="learner",
    full_name="Lee Learner",
    is_superuser=False,
)


class LoginTokenStoreTestCase(unittest.TestCase):
    def test_each_user_gets_a_token_that_resolves_only_to_them(self):
        store = LoginTokenStore()

        admin_token = store.generate_for_user(ADMIN)
        learner_token = store.generate_for_user(LEARNER)

        self.assertEqual(store.get_os_user(admin_token), ADMIN)
        self.assertEqual(store.get_os_user(learner_token), LEARNER)

    def test_generating_again_revokes_the_users_earlier_token(self):
        store = LoginTokenStore()
        renamed = ADMIN._replace(full_name="Ada Renamed")

        first_token = store.generate_for_user(ADMIN)
        second_token = store.generate_for_user(renamed)

        self.assertEqual(store.get_os_user(second_token), renamed)
        self.assertIsNone(store.get_os_user(first_token))

    def test_tokens_it_did_not_generate_resolve_to_no_user(self):
        store = LoginTokenStore()
        store.generate_for_user(ADMIN)

        for auth_token in (None, "", "not-a-token", "tökén"):
            with self.subTest(auth_token=auth_token):
                self.assertIsNone(store.get_os_user(auth_token))

    def test_import_does_not_load_kolibri_configuration_or_plugins(self):
        result = subprocess.run(
            [
                sys.executable,
                "-c",
                "import sys\n"
                "import kolibri.core.device.login_tokens\n"
                "print(','.join(m for m in ('kolibri.utils.conf', 'kolibri.plugins')"
                " if m in sys.modules))",
            ],
            stdout=subprocess.PIPE,
            universal_newlines=True,
            check=True,
        )

        self.assertEqual(result.stdout.strip(), "")
