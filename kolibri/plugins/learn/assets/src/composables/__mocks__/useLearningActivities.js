/**
 * `useLearningActivities` composable function mock.
 *
 * If default values are sufficient for tests,
 * you only need call `jest.mock('<useLearningActivities file path>')`
 * at the top of a test file.
 *
 * If you need to override some default values from some tests,
 * you can import a helper function `useLearningActivitiesMock` that accepts
 * an object with values to be overriden and use it together
 * with  `mockImplementation` as follows:
 *
 * ```
 * // eslint-disable-next-line import/named
 * import useLearningActivities, { useLearningActivitiesMock }
 *   from '<useLearningActivities file path>';
 *
 * jest.mock('<useLearningActivities file path>')
 *
 * it('test', () => {
 *   useLearningActivities.mockImplementation(
 *     () => useLearningActivitiesMock({ classes: [{ id: 'class-1' }] })
 *   );
 * })
 * ```
 *
 * You can reset your mock implementation back to default values
 * for other tests by calling the following in `beforeEach`:
 *
 * ```
 * useLearningActivities.mockImplementation(() => useLearningActivitiesMock())
 * ```
 */

const MOCK_DEFAULTS = {
  ReferenceLabel: 'Reference',
  hasSingleActivity: false,
  firstActivity: null,
  isReference: false,
  hasDuration: false,
  displayPreciseDuration: false,
  durationInSeconds: 0,
  durationEstimation: '',
  getLearningActivityLabel: jest.fn(),
};

export function useLearningActivitiesMock(overrides = {}) {
  return {
    ...MOCK_DEFAULTS,
    ...overrides,
  };
}

export default jest.fn(() => useLearningActivitiesMock());
