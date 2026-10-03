from unittest import mock

from django.test import TestCase
from django.utils.http import int_to_base36

from kolibri.core.utils.token_generator import TOKEN_EXPIRE_LIMIT
from kolibri.core.utils.token_generator import TokenGenerator


class TokenGeneratorTestCase(TestCase):
    def setUp(self):
        self.generator = TokenGenerator()
        self.user_id = "test_user_id"

    def test_token_validates_for_user_id(self):
        token = self.generator.make_token(self.user_id)
        self.assertTrue(self.generator.check_token(self.user_id, token))

    @mock.patch("kolibri.core.utils.token_generator.time.time")
    def test_token_validates_within_limit(self, time_mock):
        start_time = 1600000000
        time_mock.return_value = start_time
        token = self.generator.make_token(self.user_id)

        time_mock.return_value = start_time + TOKEN_EXPIRE_LIMIT
        self.assertTrue(self.generator.check_token(self.user_id, token))

        time_mock.return_value = start_time + TOKEN_EXPIRE_LIMIT + 1
        self.assertFalse(self.generator.check_token(self.user_id, token))

    def test_token_fails_for_different_user_id(self):
        token = self.generator.make_token(self.user_id)
        self.assertFalse(self.generator.check_token("different_user_id", token))

    @mock.patch("kolibri.core.utils.token_generator.time.time")
    def test_expired_token_with_forged_timestamp_is_rejected(self, time_mock):
        start_time = 1600000000
        time_mock.return_value = start_time
        token = self.generator.make_token(self.user_id)
        _, token_hash = token.split("-")

        now = start_time + TOKEN_EXPIRE_LIMIT + 1
        time_mock.return_value = now
        # Rewrite the expired token's timestamp to now, keeping its original hash.
        forged_token = f"{int_to_base36(now)}-{token_hash}"
        self.assertFalse(self.generator.check_token(self.user_id, forged_token))

    def test_token_with_altered_hash_is_rejected(self):
        token = self.generator.make_token(self.user_id)
        altered_char = "1" if token[-1] == "0" else "0"
        altered_token = token[:-1] + altered_char
        self.assertFalse(self.generator.check_token(self.user_id, altered_token))

    def test_missing_user_id_is_rejected_even_with_matching_token(self):
        # Each token is made for the missing ID itself, so only the guard rejects it.
        for missing_user_id in (None, ""):
            token = self.generator.make_token(missing_user_id)
            self.assertFalse(self.generator.check_token(missing_user_id, token))

    def test_token_fails_for_empty_token(self):
        self.assertFalse(self.generator.check_token(self.user_id, None))
        self.assertFalse(self.generator.check_token(self.user_id, ""))

    def test_token_fails_for_token_without_hyphen(self):
        self.assertFalse(self.generator.check_token(self.user_id, "tokenwithouthyphen"))

    def test_token_fails_for_non_base36_timestamp(self):
        self.assertFalse(
            self.generator.check_token(self.user_id, "*nonbase36-somehash")
        )
