import LearningActivities from 'kolibri-constants/labels/LearningActivities';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import { useCoachMetadataTags } from '../useCoachMetadataTags';

describe('useCoachMetadataTags', () => {
  it('getResourceTags returns one tag for a content node with a single learning activity', () => {
    const contentNode = {
      kind: 'video',
      learning_activities: [LearningActivities.WATCH],
    };
    const { getResourceTags } = useCoachMetadataTags(contentNode);

    expect(getResourceTags()).toEqual([
      expect.objectContaining({ key: LearningActivities.WATCH, icon: 'watchSolid' }),
    ]);
  });

  it('getResourceTags returns a single "multiple activities" tag for a content node with more than one learning activity', () => {
    const contentNode = {
      kind: 'video',
      learning_activities: [LearningActivities.WATCH, LearningActivities.EXPLORE],
    };
    const { getResourceTags } = useCoachMetadataTags(contentNode);

    expect(getResourceTags()).toEqual([
      expect.objectContaining({
        key: 'multipleLearningActivities',
        icon: 'allActivities',
        label: coreStrings.$tr('multipleLearningActivities'),
      }),
    ]);
  });
});
