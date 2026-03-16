/**
 * `useCourseContentProgressTracking` composable function mock.
 */

import { computed } from 'vue';

const MOCK_DEFAULTS = {
  contentNodeProgressMap: {},
  contentNodeProgressMetaDataMap: {},
  fetchContentNodeProgress: jest.fn(),
  fetchContentNodeTreeProgress: jest.fn(),
  init: jest.fn(),
};

export function useCourseContentProgressMock(overrides = {}) {
  return {
    ...MOCK_DEFAULTS,
    ...overrides,
  };
}

const INJECT_DEFAULTS = {
  sessionReady: computed(() => true),
  progress: computed(() => 0),
  time_spent: computed(() => 0),
  extra_fields: computed(() => ({})),
  pastattempts: computed(() => []),
  complete: computed(() => false),
  context: computed(() => ({})),
  totalattempts: computed(() => 0),
  mastery_criterion: computed(() => null),
  startTrackingProgress: jest.fn(),
  stopTrackingProgress: jest.fn(),
  restartContentSession: jest.fn(),
  handleUpdateProgress: jest.fn(),
  handleAddProgress: jest.fn(),
  handleUpdateInteraction: jest.fn(),
  handleUpdateContentState: jest.fn(),
  updateContentSession: jest.fn(),
  onError: jest.fn(),
};

export function injectCourseContentProgressMock(overrides = {}) {
  return {
    ...INJECT_DEFAULTS,
    ...overrides,
  };
}

export const injectCourseContentProgress = jest.fn(() => injectCourseContentProgressMock());

export default jest.fn(() => useCourseContentProgressMock());
