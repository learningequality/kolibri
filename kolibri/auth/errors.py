from kolibri.core.errors import KolibriError


class InvalidRoleKind(KolibriError):
    pass


class UserDoesNotHaveRoleError(KolibriError):
    pass


class UserHasRoleOnlyIndirectlyThroughHierarchyError(KolibriError):
    pass


class UserIsNotFacilityUser(KolibriError):
    pass


class UserIsNotMemberError(KolibriError):
    pass


class UserIsMemberOnlyIndirectlyThroughHierarchyError(KolibriError):
    pass


class InvalidHierarchyRelationsArgument(KolibriError):
    pass
