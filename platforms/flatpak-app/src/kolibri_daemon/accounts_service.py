from __future__ import annotations

import typing

from gi.repository import Gio


class AccountsServiceManager(Gio.DBusProxy):
    """
    This is a rough copy of what we need from libaccountsservice to get basic
    information about desktop users. It would be nice to use that library, but
    it is not available in the GNOME 40 flatpak runtime.
    """

    @classmethod
    def get_default(cls, connection: Gio.DBusConnection) -> AccountsServiceManager():
        return cls(
            g_connection=connection,
            g_name="org.freedesktop.Accounts",
            g_object_path="/org/freedesktop/Accounts",
            g_interface_name="org.freedesktop.Accounts",
        )

    def get_user_by_id(self, user_id: int) -> AccountsServiceUser:
        user_path = self.FindUserById("(x)", user_id)
        user_proxy = AccountsServiceUser.new_with_object_path(self, user_path)
        user_proxy.init()
        return user_proxy


class AccountsServiceUser(Gio.DBusProxy):
    ACCOUNT_TYPE_ADMIN = 1

    @classmethod
    def new_with_object_path(
        cls, manager: AccountsServiceManager, path: str
    ) -> AccountsServiceUser():
        return cls(
            g_connection=manager.get_connection(),
            g_name=manager.get_name(),
            g_object_path=path,
            g_interface_name="org.freedesktop.Accounts.User",
        )

    @property
    def user_id(self) -> int:
        return self.__unpack_property("Uid")

    @property
    def user_name(self) -> str:
        return self.__unpack_property("UserName")

    @property
    def full_name(self) -> str:
        return self.__unpack_property("RealName")

    @property
    def is_admin(self) -> bool:
        return self.__unpack_property("AccountType") == self.ACCOUNT_TYPE_ADMIN

    def __unpack_property(self, name: str) -> typing.Any:
        result = self.get_cached_property(name)
        if result is None:
            return None
        else:
            return result.unpack()
