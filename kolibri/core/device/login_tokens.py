import hmac
import secrets
import threading
import typing


class OSUserInfo(typing.NamedTuple):
    os_user_id: str
    account_name: str
    full_name: str
    is_superuser: bool


class LoginTokenStore:
    def __init__(self):
        self._lock = threading.Lock()
        self._tokens = {}

    def generate_for_user(self, os_user: OSUserInfo) -> str:
        token = secrets.token_urlsafe(32)
        with self._lock:
            self._tokens[os_user.os_user_id] = (token, os_user)
        return token

    def get_os_user(
        self, auth_token: typing.Optional[str]
    ) -> typing.Optional[OSUserInfo]:
        if not auth_token:
            return None
        auth_token = auth_token.encode()
        with self._lock:
            for token, os_user in self._tokens.values():
                if hmac.compare_digest(auth_token, token.encode()):
                    return os_user
        return None


login_tokens = LoginTokenStore()
