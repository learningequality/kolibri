"""
Android utilities for Kolibri
Provides OS user authentication via Java utilities
"""

from java import jclass

AuthUtils = jclass("org.learningequality.Kolibri.util.AuthUtils")


def get_os_user_auth_token():
    """Get or generate persistent auth token for OS user"""
    return AuthUtils.getOrCreateAuthToken()


def os_user(auth_token):
    """
    Validate auth token and return OS user info.
    Returns (username, is_valid) tuple.
    """
    if AuthUtils.validateAuthToken(auth_token):
        return (AuthUtils.getLocalizedUsername(), True)
    return (None, False)
