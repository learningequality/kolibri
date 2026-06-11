import json
from pathlib import Path

# Upper bound on auto-assignment: reserve a small buffer below the total
# number of unique 3-pick permutations (12P3 = 1320) so assignment never
# exhausts the pool entirely.
LEARNER_PICTURE_PASSWORD_LIMIT = 1300

# mapping of integer IDs to KDS icon names for picture-based login.
#
# IMPORTANT — treat this mapping as an append-only registry:
#   IDs are immutable once assigned.
#   Pictures can be added but NEVER removed or reassigned.
#   Changing or removing an ID would invalidate stored sequences
#   or point them to the wrong picture.
PICTURE_PASSWORD_SET = {
    int(key): value
    for key, value in json.loads(
        (Path(__file__).resolve().parent / "picture_passwords_set.json").read_text()
    ).items()
}

SEQUENCE_LENGTH = 3
