/**
 * `useCourseContentProgressTracking` composable function mock.
 */

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
  sessionReady: true,
  progress: 0,
  time_spent: 0,
  extra_fields: {},
  startTrackingProgress: jest.fn(),
  stopTrackingProgress: jest.fn(),
  handleUpdateProgress: jest.fn(),
  handleAddProgress: jest.fn(),
  handleUpdateContentState: jest.fn(),
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
