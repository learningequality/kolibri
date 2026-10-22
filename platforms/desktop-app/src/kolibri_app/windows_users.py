import pywintypes
import win32api
import win32net
import win32security
from django.apps import apps
from django.db import connection

from kolibri.core.device.login_tokens import OSUserInfo

_ADMINISTRATORS_SID = win32security.ConvertStringSidToSid("S-1-5-32-544")
_USER_INFO_10 = 10


def _full_name(account, domain):
    try:
        server = win32net.NetGetAnyDCName(None, domain) if domain else None
        return win32net.NetUserGetInfo(server, account, _USER_INFO_10)["full_name"]
    except pywintypes.error:
        return ""


def _has_kolibri_account(os_user_id):
    try:
        return (
            apps.get_model("device", "OSUser")
            .objects.filter(os_username=os_user_id)
            .exists()
        )
    finally:
        connection.close()


def pipe_client_user_info(pipe):
    # ImpersonateNamedPipeClient fails until a message has been read from the pipe.
    win32security.ImpersonateNamedPipeClient(pipe)
    try:
        # The client connects at SECURITY_IDENTIFICATION, at which only
        # OpenAsSelf=True can open the token.
        client_token = win32security.OpenThreadToken(
            win32api.GetCurrentThread(), win32security.TOKEN_QUERY, True
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
        is_local = domain.casefold() == win32api.GetComputerName().casefold()
        os_user_id = account if is_local else f"{domain}\\{account}"
        return OSUserInfo(
            os_user_id,
            account,
            ""
            if _has_kolibri_account(os_user_id)
            else _full_name(account, None if is_local else domain),
            is_superuser=any(sid == _ADMINISTRATORS_SID for sid, _attributes in groups),
        )
    finally:
        client_token.Close()
