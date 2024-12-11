/**
 * `useSnackbar` composable function mock.
 *
 * If default values are sufficient for tests,
 * you only need call `jest.mock('<useSnackbar file path>')`
 * at the top of a test file.
 *
 * If you need to override some default values for some tests,
 * or if you need to inspect the state of the refs during tests,
 * you can import a helper function `useSnackbarMock` that accepts
 * an object with values to be overriden and use it together
 * with  `mockImplementation` as follows:
 *
 * ```
 * // eslint-disable-next-line import/named
 * import useSnackbar, { useSnackbarMock } from '<useSnackbar file path>';
 *
 * jest.mock('<useSnackbar file path>')
 * describe('describe test', function () {
 *   let snackbar = { snackbarIsVisible: ref(false) }
 *
 *   beforeAll(() => {
 *     useSnackbar.mockImplementation(() => useSnackbarMock(snackbar)
 *   })
 *
 *   it('the test', () => {
 *     expect(get(snackbar.snackbarIsVisible)).toEqual(false);
 *   )
 * })
 * ```
 */
import { ref } from 'vue';
import { get, set } from '@vueuse/core';

const MOCK_DEFAULTS = {
  snackbarIsVisible: ref(false),
  snackbarOptions: ref({
    text: '',
    autoDismiss: true,
  }),
};

export function useSnackbarMock(overrides = {}) {
  const mocks = {
    ...MOCK_DEFAULTS,
    ...overrides,
  };

  const createSnackbar = (options = {}) => {
    // reset
    set(mocks.snackbarIsVisible, false);
    set(mocks.snackbarOptions, {});

    // set new options
    set(mocks.snackbarIsVisible, true);

    // options include text, autoDismiss, duration, actionText, actionCallback,
    // hideCallback, bottomPosition
    // if the options are a string, set it as the snackbar text
    // and default autoDismiss to true
    if (typeof options === 'string') {
      set(mocks.snackbarOptions, { text: options, autoDismiss: true });
    } else {
      set(mocks.snackbarOptions, options);
    }
  };

  const clearSnackbar = () => {
    set(mocks.snackbarIsVisible, false);
    set(mocks.snackbarOptions, {});
  };

  const setSnackbarText = text => {
    set(mocks.snackbarOptions, { ...get(mocks.snackbarOptions), text });
  };

  return {
    createSnackbar,
    clearSnackbar,
    setSnackbarText,
    ...mocks,
  };
}

export default jest.fn(() => useSnackbarMock());
