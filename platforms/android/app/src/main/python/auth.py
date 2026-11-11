"""
Android utilities for Kolibri
Provides OS user authentication via Java utilities
"""

from java import jclass

from kolibri.core.device.login_tokens import OSUserInfo

AuthUtils = jclass("org.learningequality.Kolibri.util.AuthUtils")


def get_os_user_auth_token():
    """Get or generate persistent auth token for OS user"""
    return AuthUtils.getOrCreateAuthToken()


def os_user(auth_token):
    if AuthUtils.validateAuthToken(auth_token):
        username = AuthUtils.getLocalizedUsername()
        return OSUserInfo(username, username, username, True)
    return None
