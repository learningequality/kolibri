import { LearningActivities } from 'kolibri/constants';
import useLearningActivities from '../useLearningActivities';

describe('useLearningActivities: getLearningActivityIcon', () => {
  // EXPLORE's icon is named 'interact' rather than 'explore'
  const baseNames = {
    CREATE: 'create',
    LISTEN: 'listen',
    REFLECT: 'reflect',
    PRACTICE: 'practice',
    READ: 'read',
    WATCH: 'watch',
    EXPLORE: 'interact',
  };

  const { getLearningActivityIcon } = useLearningActivities();

  describe.each(Object.entries(baseNames))('%s', (constantKey, baseName) => {
    const value = LearningActivities[constantKey];

    it('returns the solid icon by default', () => {
      expect(getLearningActivityIcon(value)).toBe(`${baseName}Solid`);
    });

    it('returns the shaded icon when shaded is true', () => {
      expect(getLearningActivityIcon(value, true)).toBe(`${baseName}Shaded`);
    });
  });

  it('returns undefined for an unknown learning activity', () => {
    expect(getLearningActivityIcon('not-an-activity')).toBeUndefined();
  });
});
