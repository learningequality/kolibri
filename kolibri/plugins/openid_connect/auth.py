import logging

from mozilla_django_oidc.auth import OIDCAuthenticationBackend
from mozilla_django_oidc.auth import SuspiciousOperation

logger = logging.getLogger(__name__)


class OIDCKolibriAuthenticationBackend(OIDCAuthenticationBackend):
    def get_or_create_user(self, access_token, id_token, payload):
        """Returns a User instance if 1 user is found. Creates a user if not found
        and configured to do so. Returns nothing if multiple users are matched."""
        user_info = self.get_userinfo(access_token, id_token, payload)
        username = user_info.get('username')

        claims_verified = self.verify_claims(user_info)
        if not claims_verified:
            msg = 'Claims verification failed'
            raise SuspiciousOperation(msg)

        # email based filtering
        users = self.filter_users_by_claims(user_info)

        if len(users) == 1:
            return self.update_user(users[0], user_info)
        elif len(users) > 1:
            # In the rare case that two user accounts have the same email address,
            # bail. Randomly selecting one seems really wrong.
            msg = 'Multiple users returned'
            raise SuspiciousOperation(msg)
        elif self.get_settings('OIDC_CREATE_USER', True):
            user = self.create_user(user_info)
            return user
        else:
            logger.debug('Login failed: No user with username  %s found, and '
                         'OIDC_CREATE_USER is False', username)
            return None

    def verify_claims(self, claims):
        """Verify the provided claims to decide if authentication should be allowed."""
        # Verify claims required by default configuration
        scopes = self.get_settings('OIDC_RP_SCOPES', 'openid profile')
        if 'username' in scopes.split():
            return 'username' in claims

        return True

    def filter_users_by_claims(self, claims):
        """Return all users matching the specified email."""
        username = claims.get('username')
        if not username:
            return self.UserModel.objects.none()
        return self.UserModel.objects.filter(username__iexact=username)

    def create_user(self, claims):
        """Return object for a newly created user account."""
        username = claims.get('username')
        first_name = claims.get('name', '')
        email = username  # not needed in Kolibri, email is not mandatory

        return self.UserModel.objects.create_user(username, email=email, first_name=first_name)
