from kolibri.core.errors import KolibriError
from kolibri.core.errors import KolibriValidationError


class InvalidRoleKind(KolibriValidationError):
    pass


class UserDoesNotHaveRoleError(KolibriError):
    pass


class UserIsNotFacilityUser(KolibriError):
    pass


class UserIsNotMemberError(KolibriError):
    pass


class IncompatibleDeviceSettingError(KolibriError):
    pass


class InvalidMembershipError(KolibriValidationError):
    pass


class InvalidCollectionHierarchy(KolibriValidationError):
    pass
