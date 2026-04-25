// See courses.models for python-matched definitions for these constants
/**
 * Unit phase constants representing the state machine for a unit's test lifecycle.
 *
 * State transitions:
 * PRE_TEST_PENDING → PRE_TEST_ACTIVE → POST_TEST_PENDING → POST_TEST_ACTIVE → COMPLETE
 */
export const UnitPhase = Object.freeze({
  PRE_TEST_PENDING: 'pre_test_pending',
  PRE_TEST_ACTIVE: 'pre_test_active',
  POST_TEST_PENDING: 'post_test_pending',
  POST_TEST_ACTIVE: 'post_test_active',
  COMPLETE: 'complete',
});

export const TestType = Object.freeze({
  PRE: 'pre',
  POST: 'post',
});

/**
 * Thresholds for classifying a learner's mastery of a learning objective.
 *
 * The ratio is computed as correctCount / numQuestions for that objective.
 * Classification:
 * LOW:  ratio <= 0.5  (0–50% correct)
 * MID:  ratio > 0.5 and <= 0.8  (51–80% correct)
 * HIGH: ratio > 0.8  (>80% correct)
 *
 * Used by classifyLearnerMastery() in utils/scoreBucketing.js.
 */
export const MasteryThreshold = Object.freeze({
  LOW: 0.5,
  HIGH: 0.8,
});

export const ScoreBucket = Object.freeze({
  LOW: 'low',
  MID: 'mid',
  HIGH: 'high',
});
