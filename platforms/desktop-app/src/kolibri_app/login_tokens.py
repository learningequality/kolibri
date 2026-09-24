import hmac
import secrets
from threading import Lock


class LoginTokenManager:
    def __init__(self):
        self._lock = Lock()
        self._tokens = {}

    def generate_for_user(self, user_name, is_admin):
        token = secrets.token_urlsafe(32)
        with self._lock:
            self._tokens[user_name] = (token, is_admin)
        return token

    def get_os_user(self, auth_token):
        if auth_token:
            auth_token = auth_token.encode()
            with self._lock:
                for user_name, (token, is_admin) in self._tokens.items():
                    if hmac.compare_digest(auth_token, token.encode()):
                        return (user_name, is_admin)
        return (None, False)
