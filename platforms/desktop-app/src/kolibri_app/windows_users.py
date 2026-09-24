import typing

import win32api
import win32security

_ADMINISTRATORS_SID = win32security.ConvertStringSidToSid("S-1-5-32-544")


class UserInfo(typing.NamedTuple):
    user_name: str
    is_admin: bool


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
        client_sid, _attributes = win32security.GetTokenInformation(
            client_token, win32security.TokenUser
        )
        account, domain, _type = win32security.LookupAccountSid(None, client_sid)
        # UAC leaves Administrators deny-only in an unelevated admin's token,
        # so match the SID whatever its attributes.
        groups = win32security.GetTokenInformation(
            client_token, win32security.TokenGroups
        )
        # A local account's domain is the computer name, which a rename changes.
        if domain.casefold() != win32api.GetComputerName().casefold():
            account = f"{domain}\\{account}"
        return UserInfo(
            account,
            is_admin=any(sid == _ADMINISTRATORS_SID for sid, _attributes in groups),
        )
    finally:
        client_token.Close()
