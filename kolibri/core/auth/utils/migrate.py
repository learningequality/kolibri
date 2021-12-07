import logging

from django.db import connections
from django.db.models import FieldDoesNotExist
from morango.registry import syncable_models
from morango.sync.backends.utils import calculate_max_sqlite_variables

from kolibri.core.auth.models import AdHocGroup
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Collection
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityDataset
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import LearnerGroup
from kolibri.core.auth.utils.delete import delete_facility
from kolibri.core.device.utils import get_device_setting
from kolibri.core.device.utils import set_device_settings
from kolibri.core.logger.models import AttemptLog
from kolibri.core.logger.models import ContentSessionLog
from kolibri.core.logger.models import ContentSummaryLog
from kolibri.core.logger.models import MasteryLog
from kolibri.core.logger.models import UserSessionLog


logger = logging.getLogger(__name__)


def _merge_user_models(source_user, target_user):
    for f in ["gender", "birth_year", "id_number"]:
        source_value = getattr(source_user, f, None)
        target_value = getattr(target_user, f, None)
        if not target_value and source_value:
            setattr(target_user, f, source_value)
    target_user.save()


def _batch_save(Model, objects):
    vendor = connections[Model.objects.db].vendor
    batch_size = (
        # Add a max possible value of 500 here to prevent:
        # OperationalError: too many terms in compound SELECT
        # Seems that this can only be changed from the command line,
        # so seems safe to assume it will always be set to the default value.
        min(calculate_max_sqlite_variables() // len(Model._meta.fields), 500)
        if vendor == "sqlite"
        else 750
    )

    Model.objects.bulk_create(objects, batch_size=batch_size)


blocklist = set(["id", "_morango_partition"])


def merge_users(source_user, target_user):  # noqa C901
    """
    Utility to merge two users. It makes no assumptions about whether
    the users are in the same facility and does raw copies of all
    associated user data, rather than try to do anything clever.
    """
    if source_user.id == target_user.id:
        raise ValueError("Cannot merge a user with themselves")

    _merge_user_models(source_user, target_user)

    id_map = {
        FacilityUser: {source_user.id: target_user.id},
        FacilityDataset: {
            source_user.dataset_id: target_user.dataset_id,
        },
    }

    def _merge_log_data(LogModel):
        log_map = {}
        id_map[LogModel] = log_map
        new_logs = []
        related_fields = [f for f in LogModel._meta.concrete_fields if f.is_relation]
        source_logs = LogModel.objects.filter(user=source_user)
        target_log_ids = set(
            LogModel.objects.filter(user=target_user).values_list("id", flat=True)
        )
        for log in source_logs:
            # Get all serialializable fields
            data = log.serialize()
            # Remove fields that we explicitly know we don't want to copy
            for f in blocklist:
                if f in data:
                    del data[f]
            # Iterate through each relation and map the old id to the new id for the foreign key
            for relation in related_fields:
                data[relation.attname] = id_map[relation.related_model][
                    data[relation.attname]
                ]
            # If this is a randomly created source id, preserve it, so we can stop the same logs
            # being copied in repeatedly. If it is not random, remove it, so we can recreate
            # it on the target.
            if log.calculate_source_id() is not None:
                del data["_morango_source_id"]
            new_log = LogModel()
            for field, value in data.items():
                try:
                    field_obj = LogModel._meta.get_field(field)
                    if hasattr(field_obj, "from_db_value"):
                        value = field_obj.from_db_value(value, None, None, None)
                except FieldDoesNotExist:
                    pass
                setattr(new_log, field, value)
            if not new_log._morango_source_id:
                new_log.id = new_log.calculate_uuid()
            else:
                # Have to do this, otherwise morango will overwrite the current source id on the model
                new_log.id = new_log.compute_namespaced_id(
                    new_log.calculate_partition(),
                    new_log._morango_source_id,
                    new_log.morango_model_name,
                )
                new_log._morango_partition = new_log.calculate_partition().replace(
                    new_log.ID_PLACEHOLDER, new_log.id
                )
            log_map[log.id] = new_log.id
            if new_log.id not in target_log_ids:
                new_logs.append(new_log)

        _batch_save(LogModel, new_logs)

    _merge_log_data(ContentSessionLog)

    _merge_log_data(ContentSummaryLog)

    _merge_log_data(UserSessionLog)

    _merge_log_data(MasteryLog)

    _merge_log_data(AttemptLog)


fork_blocklist = {"id", "_morango_partition", "_morango_source_id"}


def filter_blocklist(data):
    return {k: v for k, v in data.items() if k not in fork_blocklist}


def _copy_data(Model, id_map, source_data):
    logger.info("Copying data for model {}".format(Model))
    obj_map = id_map.get(Model, {})
    id_map[Model] = obj_map
    new_objs = []
    related_fields = [f for f in Model._meta.concrete_fields if f.is_relation]

    for obj in source_data:
        # Get all serialializable fields
        data = filter_blocklist(obj.serialize())
        # Iterate through each relation and map the old id to the new id for the foreign key
        for relation in related_fields:
            if data[relation.attname] is not None:
                data[relation.attname] = id_map[relation.related_model][
                    data[relation.attname]
                ]
        new_obj = Model()
        for field, value in data.items():
            try:
                field_obj = Model._meta.get_field(field)
                if hasattr(field_obj, "from_db_value"):
                    value = field_obj.from_db_value(value, None, None, None)
            except FieldDoesNotExist:
                pass
            setattr(new_obj, field, value)
        new_obj.id = new_obj.calculate_uuid()
        obj_map[obj.id] = new_obj.id
        if issubclass(Model, Collection):
            # Also log proxy models into the collection id map
            id_map[Collection][obj.id] = new_obj.id
        new_objs.append(new_obj)

    _batch_save(Model, new_objs)
    logger.info("Finished copying data for model {}".format(Model))


def fork_facility(facility):
    """
    Utility function to make a complete copy of all facility data, but separated from the original
    facility.
    """
    logger.info("Making a copy of facility {}".format(facility.name))
    logger.info("Copying dataset with id {}".format(facility.dataset_id))
    dataset_data = filter_blocklist(facility.dataset.serialize())
    # The new facility will not be registered on KDP
    del dataset_data["registered"]
    new_dataset = FacilityDataset.deserialize(dataset_data)
    new_dataset.save()
    logger.info("Copied facility dataset")
    id_map = {
        FacilityDataset: {facility.dataset_id: new_dataset.id},
        # Preseed this as we are not directly copying the Collection model, only
        # its proxy models.
        Collection: {},
    }
    # Explicitly include the Collection proxy models as their order will not have been properly inferred
    # by their FK relationships.
    facility_dataset_models = [
        Facility,
        Classroom,
        LearnerGroup,
        AdHocGroup,
    ] + syncable_models.get_models("facilitydata")
    for Model in facility_dataset_models:
        # This should prevent any repeats caused by our explicit copying of FacilityDataset and our explicit
        # ordered inclusion of the Collection proxy models above.
        if Model not in id_map:
            _copy_data(
                Model, id_map, Model.objects.filter(dataset_id=facility.dataset_id)
            )
    logger.info("Completed making a copy of facility {}".format(facility.name))
    return new_dataset


def migrate_facility(facility):
    """
    Function to migrate an existing facility to a new facility. Copies all facility data into
    a new facility, and then deletes the old facility, including from the morango store.
    """
    new_dataset = fork_facility(facility)
    default_facility = get_device_setting("default_facility", None)
    if default_facility and default_facility.id == facility.id:
        new_facility = Facility.objects.get(dataset_id=new_dataset.id)
        set_device_settings(default_facility=new_facility)
    delete_facility(facility)
    logger.info("Finished migrating facility {}".format(facility.name))
