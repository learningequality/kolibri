import H5PShim from './H5PShim';

describe('H5PShim', () => {
  let mockMediator;

  beforeEach(() => {
    mockMediator = {
      registerMessageHandler: jest.fn(),
      sendMessage: jest.fn(),
    };
  });

  it('should keep the runner reading state that arrives after it was created', () => {
    const RealRunner = jest.requireActual('./H5PRunner').default;
    const shim = new H5PShim(mockMediator);
    const runner = new RealRunner(shim);

    shim.setData({ 0: { answers: '[1]' } });

    expect(runner.data).toEqual({ 0: { answers: '[1]' } });
  });

  it('should resolve the integration through a runner wired up after install', () => {
    // The handler installs the shim before it has a runner, so the property has
    // to be an accessor: a plain value captured at install time would be undefined.
    const RealRunner = jest.requireActual('./H5PRunner').default;
    const contentWindow = {};
    const shim = new H5PShim(mockMediator);
    shim.initialize(contentWindow);

    const runner = new RealRunner(shim);
    shim.setRunner(runner);

    expect(contentWindow.H5PIntegration).toBe(runner.buildIntegration());
  });

  it('should name the learner in the integration H5P reads', () => {
    const RealRunner = jest.requireActual('./H5PRunner').default;
    const shim = new H5PShim(mockMediator);
    const runner = new RealRunner(shim);

    shim.setUserData({ userFullName: 'Test Learner' });

    expect(runner.buildIntegration().user).toEqual({ name: 'Test Learner', mail: '' });
  });

  it('should name the learner as empty when there is no user data', () => {
    const RealRunner = jest.requireActual('./H5PRunner').default;
    const runner = new RealRunner(new H5PShim(mockMediator));

    expect(runner.buildIntegration().user).toEqual({ name: '', mail: '' });
  });
});
