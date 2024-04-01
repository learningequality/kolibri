import unittest

from django.core.exceptions import ValidationError

from kolibri.core.auth.constants.demographics import DescriptionTranslationValidator
from kolibri.core.auth.constants.demographics import EnumValuesValidator
from kolibri.core.auth.constants.demographics import LabelTranslationValidator
from kolibri.core.auth.constants.demographics import UniqueIdsValidator


class TestDemographicValidation(unittest.TestCase):
    def test_validate_unique_objects(self):
        validator = UniqueIdsValidator("custom_demographics")
        with self.assertRaises(ValidationError):
            validator({"custom_demographics": [{"id": "1"}, {"id": "1"}]})
        validator({"custom_demographics": [{"id": "1"}, {"id": "2"}]})

    def test_validate_unique_description_translations(self):
        validator = DescriptionTranslationValidator("custom_demographics")
        with self.assertRaises(ValidationError):
            validator(
                {
                    "custom_demographics": [
                        {
                            "id": "1",
                            "description": "description",
                            "translations": [{"language": "en"}, {"language": "en"}],
                        }
                    ]
                }
            )
        validator(
            {
                "custom_demographics": [
                    {
                        "id": "1",
                        "description": "description",
                        "translations": [{"language": "en"}, {"language": "fr"}],
                    }
                ]
            }
        )

    def test_validate_unique_description_no_translations(self):
        validator = DescriptionTranslationValidator("custom_demographics")
        try:
            validator(
                {"custom_demographics": [{"id": "1", "description": "description"}]}
            )
        except Exception:
            self.fail("Unexpected exception raised")

    def test_validate_unique_values(self):
        validator = EnumValuesValidator("custom_demographics")
        with self.assertRaises(ValidationError):
            validator(
                {
                    "custom_demographics": [
                        {
                            "id": "1",
                            "description": "description",
                            "enumValues": [{"value": "1"}, {"value": "1"}],
                        }
                    ]
                }
            )
        validator(
            {
                "custom_demographics": [
                    {
                        "id": "1",
                        "description": "description",
                        "enumValues": [{"value": "1"}, {"value": "2"}],
                    }
                ]
            }
        )

    def test_validate_unique_label_translations(self):
        validator = LabelTranslationValidator("custom_demographics")
        with self.assertRaises(ValidationError):
            validator(
                {
                    "custom_demographics": [
                        {
                            "id": "1",
                            "description": "description",
                            "enumValues": [
                                {
                                    "value": "1",
                                    "defaultLabel": "test",
                                    "translations": [
                                        {"language": "en"},
                                        {"language": "en"},
                                    ],
                                },
                                {"value": "2"},
                            ],
                        }
                    ]
                }
            )
        validator(
            {
                "custom_demographics": [
                    {
                        "id": "1",
                        "description": "description",
                        "enumValues": [
                            {
                                "value": "1",
                                "defaultLabel": "test",
                                "translations": [
                                    {"language": "en"},
                                    {"language": "fr"},
                                ],
                            },
                            {"value": "2"},
                        ],
                    }
                ]
            }
        )

    def test_validate_unique_label_no_translations(self):
        validator = LabelTranslationValidator("custom_demographics")
        try:
            validator(
                {
                    "custom_demographics": [
                        {
                            "id": "1",
                            "description": "description",
                            "enumValues": [
                                {"value": "1", "defaultLabel": "test"},
                                {"value": "2"},
                            ],
                        }
                    ]
                }
            )
        except Exception:
            self.fail("Unexpected exception raised")
