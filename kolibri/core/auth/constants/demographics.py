from __future__ import unicode_literals

MALE = "MALE"
FEMALE = "FEMALE"
NOT_SPECIFIED = "NOT_SPECIFIED"
DEFERRED = "DEFERRED"


choices = (
    (MALE, "Male"),
    (FEMALE, "Female"),
    (NOT_SPECIFIED, "Not specified"),
    (DEFERRED, "Defers for later"),
)

DEMO_FIELDS = ("gender", "birth_year", "id_number")
