import { ref } from 'vue';
import { ContentNodeKinds } from 'kolibri/constants';
import { coreString, coreStrings } from 'kolibri/uiText/commonCoreStrings';

export function useCoachMetadataTags(contentNode) {
  const tags = ref([]);

  const getCategoryTags = () => {
    if (!contentNode.categories) return [];
    return contentNode.categories.map(category => coreString(category));
  };

  const getLevelTags = () => {
    if (!contentNode.grade_levels) return [];
    return contentNode.grade_levels.map(grade_levels => coreString(grade_levels));
  };

  const getLanguageTag = () => {
    if (!contentNode.lang) return [];
    return contentNode.lang.lang_name;
  };

  const getActivityTag = () => {
    if (!contentNode.learning_activities) return [];

    return contentNode.learning_activities.length > 1
      ? [coreStrings.$tr('multipleLearningActivities')]
      : contentNode.learning_activities.map(activity => coreString(activity));
  };

  const getDurationTag = () => {
    if (!contentNode.duration) return [];
    return contentNode.duration.map(duration => coreStrings.formatDuration(duration));
  };

  const getSpecificCategoryTag = () => {
    if (!contentNode.categories) return [];
    const specificCategories = contentNode.categories.filter(
      category => category.split('.').length > 2,
    );
    return specificCategories.map(category => coreString(category));
  };

  if (
    contentNode.kind === ContentNodeKinds.CHANNEL ||
    contentNode.kind === ContentNodeKinds.TOPIC
  ) {
    tags.value = [
      ...getCategoryTags().slice(0, 3),
      ...getLevelTags().slice(0, 3),
      ...getLanguageTag(),
    ];
  } else {
    tags.value = [
      ...getActivityTag(),
      ...getDurationTag(),
      ...getLevelTags(),
      ...getSpecificCategoryTag(),
      ...getLanguageTag(),
    ].slice(0, 3);
  }

  return {
    tags,
  };
}
