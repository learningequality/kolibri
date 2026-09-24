from __future__ import annotations

import threading
import typing
from uuid import uuid4


class LoginToken(typing.NamedTuple):
    user_name: str
    is_admin: bool
    key: str


class LoginTokenManager(object):
    def __init__(self):
        self.__login_tokens = {}
        # The GLib thread writes tokens while Kolibri's request threads read them.
        self.__lock = threading.Lock()

    def generate_for_user(self, user_id: int, user_name: str, is_admin: bool) -> str:
        with self.__lock:
            return self.__add_login_token(str(user_id), user_name, is_admin)

    def get_os_user(
        self, token_key: typing.Optional[str]
    ) -> typing.Tuple[typing.Optional[str], bool]:
        if not token_key:
            return (None, False)

        with self.__lock:
            login_token = self.__get_login_token(token_key)

        if not login_token:
            return (None, False)

        return (login_token.user_name, login_token.is_admin)

    def __add_login_token(self, user_id: str, user_name: str, is_admin: bool) -> str:
        token_key = self.__generate_token_key(user_id)
        # We are unable to predict when Kolibri will attempt to authenticate
        # using a login token, so tokens can be reused and have no expiry
        # time. This is usually fine, because the login token generates a
        # session token which lasts for the same length of time.
        login_token = LoginToken(user_name=user_name, is_admin=is_admin, key=token_key)
        # We only allow one token at a time to be associated with a particular
        # user. Using a dictionary provides that for free.
        self.__login_tokens[user_id] = login_token
        return token_key

    def __generate_token_key(self, user_id: str) -> str:
        return f"{user_id}:{uuid4().hex}"

    def __get_login_token(self, token_key: str) -> typing.Optional[LoginToken]:
        user_id, _sep, _uuid = token_key.partition(":")
        login_token = self.__login_tokens.get(user_id, None)
        if login_token and login_token.key == token_key:
            return login_token
        return None


# kolibri-daemon issues tokens from its D-Bus thread before Kolibri is
# initialized, so this lives outside kolibri_plugin, which imports Kolibri.
login_tokens = LoginTokenManager()
