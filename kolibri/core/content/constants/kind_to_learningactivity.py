from le_utils.constants import content_kinds
from le_utils.constants.labels import learning_activities


kind_activity_map = {
    content_kinds.EXERCISE: learning_activities.PRACTICE,
    content_kinds.VIDEO: learning_activities.WATCH,
    content_kinds.AUDIO: learning_activities.LISTEN,
    content_kinds.DOCUMENT: learning_activities.READ,
    content_kinds.HTML5: learning_activities.EXPLORE,
    content_kinds.H5P: learning_activities.EXPLORE,
}
