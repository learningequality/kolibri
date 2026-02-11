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

export const TestStatus = Object.freeze({
  NOT_STARTED: 'not_started',
  ACTIVE: 'active',
  ENDED: 'ended',
});
