import {
  filterObjectivesForLesson,
  computeResourceTally,
} from '../../../composables/useUnitDetail';

describe('filterObjectivesForLesson', () => {
  const ALL_OBJECTIVES = [
    { id: 'lo-1', text: 'LO 1', lowCount: 1, midCount: 0, highCount: 2 },
    { id: 'lo-2', text: 'LO 2', lowCount: 0, midCount: 3, highCount: 1 },
    { id: 'lo-3', text: 'LO 3', lowCount: 2, midCount: 1, highCount: 0 },
  ];

  it('returns only objectives mapped to the given lesson', () => {
    const map = { 'lesson-1': ['lo-1', 'lo-3'], 'lesson-2': ['lo-2'] };
    expect(filterObjectivesForLesson('lesson-1', map, ALL_OBJECTIVES)).toEqual([
      ALL_OBJECTIVES[0],
      ALL_OBJECTIVES[2],
    ]);
  });

  it('returns empty array when lesson has no objectives mapping', () => {
    expect(filterObjectivesForLesson('lesson-x', {}, ALL_OBJECTIVES)).toEqual([]);
  });
});

describe('computeResourceTally', () => {
  const LEARNER_IDS = ['u1', 'u2', 'u3', 'u4'];

  it('counts statuses correctly across learners', () => {
    const index = {
      'content-1': {
        u1: 'Completed',
        u2: 'Started',
        u3: 'HelpNeeded',
        // u4 absent → NotStarted
      },
    };
    expect(computeResourceTally('content-1', index, LEARNER_IDS)).toEqual({
      completed: 1,
      started: 1,
      helpNeeded: 1,
      notStarted: 1,
      total: 4,
    });
  });

  it('treats all learners as notStarted when content has no status entries', () => {
    expect(computeResourceTally('unknown-content', {}, LEARNER_IDS)).toEqual({
      completed: 0,
      started: 0,
      helpNeeded: 0,
      notStarted: 4,
      total: 4,
    });
  });

  it('returns zero totals for empty learner list', () => {
    const index = { 'content-1': { u1: 'Completed' } };
    expect(computeResourceTally('content-1', index, [])).toEqual({
      completed: 0,
      started: 0,
      helpNeeded: 0,
      notStarted: 0,
      total: 0,
    });
  });
});
