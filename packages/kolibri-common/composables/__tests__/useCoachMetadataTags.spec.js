import LearningActivities from 'kolibri-constants/labels/LearningActivities';
import { useCoachMetadataTags } from '../useCoachMetadataTags';

// Mock coreString/coreStrings the same way other composable specs do, since the
// real commonCoreStrings catalog isn't available in the test environment.
jest.mock('kolibri/uiText/commonCoreStrings', () => {
  return {
    coreString: jest.fn(key => key),
    coreStrings: { $tr: jest.fn(key => key) },
  };
});

describe('useCoachMetadataTags', () => {
  it('getResourceTags does not throw for a content node with a single learning activity', () => {
    const contentNode = {
      kind: 'video',
      learning_activities: [LearningActivities.WATCH],
    };
    const { getResourceTags } = useCoachMetadataTags(contentNode);

    expect(() => getResourceTags()).not.toThrow();
    expect(getResourceTags()).toEqual([
      expect.objectContaining({ key: LearningActivities.WATCH, icon: 'watchSolid' }),
    ]);
  });

  it('getResourceTags does not throw and returns a single "multiple activities" tag for a content node with more than one learning activity', () => {
    const contentNode = {
      kind: 'video',
      learning_activities: [LearningActivities.WATCH, LearningActivities.EXPLORE],
    };
    const { getResourceTags } = useCoachMetadataTags(contentNode);

    expect(() => getResourceTags()).not.toThrow();
    expect(getResourceTags()).toEqual([
      expect.objectContaining({ key: 'multipleLearningActivities', icon: 'allActivities' }),
    ]);
  });
});
