import typing

import win32api
import win32security

_ADMINISTRATORS_SID = win32security.ConvertStringSidToSid("S-1-5-32-544")


class UserInfo(typing.NamedTuple):
    user_name: str
    is_admin: bool


def _user_sid(token):
    sid, _attributes = win32security.GetTokenInformation(token, win32security.TokenUser)
    return sid


def _server_sid():
    token = win32security.OpenProcessToken(
        win32api.GetCurrentProcess(), win32security.TOKEN_QUERY
    )
    try:
        return _user_sid(token)
    finally:
        token.Close()


_SERVER_SID = _server_sid()


def pipe_client_user_info(pipe):
    # ImpersonateNamedPipeClient fails until a message has been read from the pipe.
    win32security.ImpersonateNamedPipeClient(pipe)
    try:
        client_token = win32security.OpenThreadToken(
            win32api.GetCurrentThread(), win32security.TOKEN_QUERY, False
        )
    finally:
        win32security.RevertToSelf()
    try:
        client_sid = _user_sid(client_token)
        account, domain, _type = win32security.LookupAccountSid(None, client_sid)
        user_name = f"{domain}\\{account}"
        if client_sid == _SERVER_SID:
            return UserInfo(user_name, is_admin=True)
        # UAC leaves Administrators deny-only in an unelevated admin's token,
        # so match the SID whatever its attributes.
        groups = win32security.GetTokenInformation(
            client_token, win32security.TokenGroups
        )
        return UserInfo(
            user_name,
            is_admin=any(sid == _ADMINISTRATORS_SID for sid, _attributes in groups),
        )
    finally:
        client_token.Close()
