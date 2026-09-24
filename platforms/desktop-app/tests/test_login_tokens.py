import unittest

from kolibri_app.login_tokens import LoginTokenManager


class TestLoginTokenManager(unittest.TestCase):
    def test_each_user_gets_a_token_that_resolves_only_to_them(self):
        manager = LoginTokenManager()

        admin_token = manager.generate_for_user("admin", True)
        learner_token = manager.generate_for_user("learner", False)

        self.assertEqual(manager.get_os_user(admin_token), ("admin", True))
        self.assertEqual(manager.get_os_user(learner_token), ("learner", False))

    def test_generating_again_revokes_the_users_earlier_token(self):
        manager = LoginTokenManager()

        first_token = manager.generate_for_user("alice", False)
        second_token = manager.generate_for_user("alice", False)

        self.assertEqual(manager.get_os_user(second_token), ("alice", False))
        self.assertEqual(manager.get_os_user(first_token), (None, False))

    def test_tokens_it_did_not_generate_resolve_to_no_user(self):
        manager = LoginTokenManager()
        manager.generate_for_user("admin", True)

        for auth_token in (None, "", "not-a-token", "tökén"):
            with self.subTest(auth_token=auth_token):
                self.assertEqual(manager.get_os_user(auth_token), (None, False))
