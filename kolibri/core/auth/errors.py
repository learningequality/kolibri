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


class NoAvailableSequences(KolibriError):
    pass


class SequenceAlreadyAssigned(KolibriError):
    pass


class FacilityLookupError(KolibriError):
    pass


class MultipleFacilitiesError(FacilityLookupError):
    def __init__(self, message, facilities):
        super().__init__(message)
        self.facilities = facilities


class SyncError(KolibriError):
    pass


class MissingSyncCredentialsError(SyncError):
    pass


class DeviceNotProvisionedError(KolibriError):
    pass


class BulkUserImportError(KolibriError):
    pass


class BulkUserExportError(KolibriError):
    pass


class FacilityDeletionCountMismatch(KolibriError):
    pass
