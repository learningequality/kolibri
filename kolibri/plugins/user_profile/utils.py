import time

from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils import six
from django.utils.crypto import constant_time_compare
from django.utils.http import base36_to_int

TOKEN_EXPIRE_LIMIT = 900  # 15 minutes


class TokenGenerator(PasswordResetTokenGenerator):
    """
    Subclass of django PasswordResetTokenGenerator that:
      - expires the token after some seconds, instead of one day
      - uses the username instead of the user pk
    """

    def make_token(self, username):
        """
        Returns a token that can be used for TOKEN_EXPIRE_LIMIT seconds
        """
        return self._make_token_with_timestamp(username, int(time.time()))

    def check_token(self, username, token):
        """
        Check that a token is valid within the expiration time window.
        """
        if not (username and token):
            return False
        # Parse the token
        try:
            ts_b36, hash = token.split("-")
        except ValueError:
            return False

        try:
            ts = base36_to_int(ts_b36)
        except ValueError:
            return False

        # Check that the timestamp/uid has not been tampered with
        if not constant_time_compare(
            self._make_token_with_timestamp(username, ts), token
        ):
            return False

        # Check the timestamp is within limit
        if (time.time() - ts) > TOKEN_EXPIRE_LIMIT:
            return False

        return True

    def _make_hash_value(self, username, timestamp):
        # Ensure results are consistent across DB backends
        return six.text_type(username) + six.text_type(timestamp)
