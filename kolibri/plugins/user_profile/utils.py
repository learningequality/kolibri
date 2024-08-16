import time

from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.crypto import constant_time_compare
from django.utils.http import base36_to_int

TOKEN_EXPIRE_LIMIT = 900  # 15 minutes


class TokenGenerator(PasswordResetTokenGenerator):
    """
    Subclass of django PasswordResetTokenGenerator that:
      - expires the token after some seconds, instead of one day
    """

    def _make_hash_value(self, user_id, timestamp):
        """
        Override the hash value to only need the user_id and timestamp
        to allow us to calculate before we have imported the remote user.
        """
        return f"{user_id}{timestamp}"

    def make_token(self, user):
        """
        Returns a token that can be used for TOKEN_EXPIRE_LIMIT seconds
        """
        return self._make_token_with_timestamp(user, int(time.time()))

    def check_token(self, user, token):
        """
        Check that a token is valid within the expiration time window.
        """
        if not (user and token):
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
        if not constant_time_compare(self._make_token_with_timestamp(user, ts), token):
            return False

        # Check the timestamp is within limit
        if (time.time() - ts) > TOKEN_EXPIRE_LIMIT:
            return False

        return True
