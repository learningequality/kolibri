import json
import logging

from django.core.management.base import BaseCommand

from kolibri.core.device.models import DeviceSettings
from kolibri.core.device.models import extra_settings_schema
from kolibri.core.device.utils import get_device_setting
from kolibri.core.device.utils import set_device_settings

logger = logging.getLogger(__name__)

# model fields that can be set
EDITABLE_FIELDS = [
    "allow_guest_access",
    "allow_peer_unlisted_channel_import",
    "allow_learner_unassigned_resource_access",
    "allow_other_browsers_to_connect",
]
EXTRA_PROPERTIES = extra_settings_schema.get("properties", {})
EDITABLE_FIELDS.extend(EXTRA_PROPERTIES.keys())
SCHEMA_TYPES = {
    "boolean": bool,
    "string": str,
    "integer": int,
    "array": list,
}
DJANGO_FIELD_TYPES = {
    "BooleanField": bool,
    "CharField": str,
    "IntegerField": int,
}


class Command(BaseCommand):
    """
    This command can be used to get or set Kolibri's device settings.
    """

    def add_arguments(self, parser):
        parser.add_argument(
            "operation",
            action="store",
            choices=["get", "set"],
            help="Get or set the device settings",
        )

        parser.add_argument("--json", action="store_true", help="Output as JSON")

        for field_name in EDITABLE_FIELDS:
            field_type = self._get_type(field_name)
            if field_type == bool:
                parser.add_argument(
                    "--{}".format(self._setting_to_arg(field_name)),
                    action="store_true",
                    default=None,
                    help="Set '{}' to True".format(field_name),
                )
                parser.add_argument(
                    "--{}".format(self._setting_to_arg(field_name, negate=True)),
                    action="store_false",
                    default=None,
                    help="Set '{}' to False".format(field_name),
                )
            else:
                parser.add_argument(
                    "--{}".format(self._setting_to_arg(field_name)),
                    action="store",
                    default=None,
                    type=field_type,
                    help="Set '{}' to a value".format(field_name),
                )

    def handle(self, *args, **options):
        operation = options["operation"]
        if operation == "get":
            self.handle_get(*args, **options)
        elif operation == "set":
            self.handle_set(*args, **options)

    def handle_get(self, *args, **options):
        data = [
            (field_name, get_device_setting(field_name))
            for field_name in EDITABLE_FIELDS
        ]

        if options["json"]:
            logger.info(json.dumps(dict(data), indent=2))
        else:
            header = ("Device setting", "Value")
            self._tabulate(header, data)

    def handle_set(self, *args, **options):
        updated_settings = {}

        for option_key, option_value in options.items():
            setting, _ = self._arg_to_setting(option_key)
            if option_value is not None and setting in EDITABLE_FIELDS:
                updated_settings[setting] = option_value

        set_device_settings(**updated_settings)
        logger.info("Device settings updated")

    def _get_type(self, field_name):
        if field_name in EXTRA_PROPERTIES:
            field_type = EXTRA_PROPERTIES[field_name]["type"]
            return SCHEMA_TYPES[field_type]
        field_type = DeviceSettings._meta.get_field(field_name).get_internal_type()
        return DJANGO_FIELD_TYPES[field_type]

    def _setting_to_arg(self, setting, negate=False):
        arg = setting.replace("_", "-")
        if negate:
            if arg.startswith("allow"):
                arg = arg.replace("allow", "disallow")
            elif arg.startswith("enable"):
                arg = arg.replace("enable", "disable")
            elif arg.startswith("set"):
                arg = arg.replace("set", "remove")
        return arg

    def _arg_to_setting(self, arg):
        negated = False
        setting = arg
        if arg.startswith("disallow"):
            setting = setting.replace("disallow", "allow")
            negated = True
        elif setting.startswith("disable"):
            setting = setting.replace("disable", "enable")
            negated = True
        elif setting.startswith("remove"):
            setting = setting.replace("remove", "set")
            negated = True
        return (setting, negated)

    def _tabulate(self, header, data):
        """
        Prints a table with the given header and data.
        """
        col_length = [0] * len(header)
        for i, col in enumerate(header):
            col_length[i] = max(col_length[i], len(str(col)))
        for row in data:
            for i, col in enumerate(row):
                col_length[i] = max(col_length[i], len(str(col)))

        logger.info(
            " | ".join([str(col).ljust(col_length[i]) for i, col in enumerate(header)])
        )
        logger.info("-+-".join(["-" * col_length[i] for i, col in enumerate(header)]))
        for row in data:
            logger.info(
                " | ".join([str(col).ljust(col_length[i]) for i, col in enumerate(row)])
            )
