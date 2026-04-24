/**
 * `appError` utility module mock.
 *
 * If default values are sufficient for tests,
 * you only need call `jest.mock('kolibri/utils/appError')`
 * at the top of a test file.
 *
 * If you need to override some default values for some tests,
 * or if you need to inspect the state of the refs during tests,
 * you can import a helper function `appErrorMock` that accepts
 * an object with values to be overriden and use it together
 * with `jest.replaceProperty` or direct assignment as follows:
 *
 * ```
 * import { appErrorMock } from 'kolibri/utils/appError';
 *
 * jest.mock('kolibri/utils/appError')
 * ```
 */
import { ref } from 'vue';
import { set } from '@vueuse/core';

const MOCK_DEFAULTS = {
  error: ref(null),
};

export function appErrorMock(overrides = {}) {
  const mocks = {
    ...MOCK_DEFAULTS,
    ...overrides,
  };

  const handleError = jest.fn(errorString => {
    set(mocks.error, errorString);
  });

  const clearError = jest.fn(() => {
    set(mocks.error, null);
  });

  const handleApiError = jest.fn(({ error: err } = {}) => {
    set(mocks.error, typeof err === 'string' ? err : JSON.stringify(err));
  });

  return {
    handleError,
    handleApiError,
    clearError,
    ...mocks,
  };
}

const _sharedMock = appErrorMock();

export const error = _sharedMock.error;
export const handleError = _sharedMock.handleError;
export const handleApiError = _sharedMock.handleApiError;
export const clearError = _sharedMock.clearError;
