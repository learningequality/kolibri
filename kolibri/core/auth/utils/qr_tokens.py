import logging
import secrets

from django.db.utils import IntegrityError


logger = logging.getLogger(__name__)


def generate_qr_login_token():
    """
    Generate a new random QR login token.

    Uses `secrets.token_urlsafe(32)` which returns ~43 url-safe characters
    representing 32 bytes of entropy (256 bits). The keyspace is large enough
    that collisions are astronomically unlikely and brute-force is infeasible.
    """
    return secrets.token_urlsafe(32)


def _is_eligible_for_qr_login(user):
    """
    A user is eligible for a QR login token only if they are a learner
    (no roles) and not a superuser. Mirrors the picture password eligibility
    rule used by `PicturePasswordAuthScope.matches_credentials`.
    """
    if user.is_superuser:
        return False
    return not user.roles.exists()


def assign_qr_login_token(user):
    """
    Assign a unique QR login token to the user if they are eligible and don't
    already have one.

    Handles IntegrityError (race condition where another request assigned the
    same token between our read and write, or a sync collision) by retrying
    once with a fresh token.

    :param user: A FacilityUser instance
    :return: True if a token was assigned (or was already present and the user
             is eligible); False if the user is not eligible.
    """
    if not _is_eligible_for_qr_login(user):
        return False

    if user.qr_login_token is not None:
        return True

    user.qr_login_token = generate_qr_login_token()
    try:
        user.save(update_fields=["qr_login_token"])
    except IntegrityError:
        logger.warning("QR login token collision for user %s, retrying.", user.id)
        user.qr_login_token = generate_qr_login_token()
        try:
            user.save(update_fields=["qr_login_token"])
        except IntegrityError:
            # Effectively impossible with 256 bits of entropy, but raise so
            # callers can handle it rather than silently failing.
            raise

    return True


def reassign_qr_login_token(user):
    """
    Replace the user's existing QR login token with a fresh one. Useful when
    a card has been lost or compromised. The previous token is invalidated
    immediately.

    :param user: A FacilityUser instance
    :return: True if a new token was assigned; False if the user is not
             eligible (in which case any existing token is cleared).
    """
    if not _is_eligible_for_qr_login(user):
        if user.qr_login_token is not None:
            user.qr_login_token = None
            user.save(update_fields=["qr_login_token"])
        return False

    user.qr_login_token = generate_qr_login_token()
    try:
        user.save(update_fields=["qr_login_token"])
    except IntegrityError:
        # Vanishingly unlikely; fall back to assign which retries.
        user.qr_login_token = None
        return assign_qr_login_token(user)
    return True


def clear_qr_login_token(user):
    """
    Remove the user's QR login token (e.g. when they are promoted to a role).
    """
    if user.qr_login_token is None:
        return
    user.qr_login_token = None
    user.save(update_fields=["qr_login_token"])


__all__ = [
    "generate_qr_login_token",
    "assign_qr_login_token",
    "reassign_qr_login_token",
    "clear_qr_login_token",
]
