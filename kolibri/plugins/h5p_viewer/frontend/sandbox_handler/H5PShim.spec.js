import { events } from 'kolibri-sandbox/base';
import H5PHandler from './H5PHandler';
import H5PRunner from './H5PRunner';
import H5PShim from './H5PShim';

jest.mock('./H5PRunner');

describe('H5PShim', () => {
  let mockMediator;
  let mockSandbox;

  beforeEach(() => {
    H5PRunner.mockClear();
    mockMediator = {
      registerMessageHandler: jest.fn(),
      sendMessage: jest.fn(),
    };
    mockSandbox = { mediator: mockMediator, registerHandler: jest.fn() };
  });

  it('should be the shim the runner persists H5P user data through', () => {
    // Content played on 0.19.x has its resume state keyed by 'H5P' in contentState,
    // so the shim the runner writes through has to be this one - hand it the xAPI
    // shim it sits alongside and everything saved before the upgrade is orphaned.
    const handler = new H5PHandler(mockSandbox);

    handler.init(document.createElement('iframe'), 'test.h5p');

    expect(H5PRunner).toHaveBeenCalledWith(expect.objectContaining({ nameSpace: 'H5P' }));
  });

  it('should keep the runner reading state that arrives after it was created', () => {
    const RealRunner = jest.requireActual('./H5PRunner').default;
    const shim = new H5PShim(mockMediator);
    const runner = new RealRunner(shim);

    shim.setData({ 0: { answers: '[1]' } });

    expect(runner.data).toEqual({ 0: { answers: '[1]' } });
  });

  it('should name the learner in the integration H5P reads', () => {
    // H5P puts this on the actor of every xAPI statement it sends.
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

  it('should send state under the H5P namespace', () => {
    const shim = new H5PShim(mockMediator);
    shim.data = { 0: { answers: '[1]' } };

    shim.stateUpdated();

    expect(mockMediator.sendMessage).toHaveBeenCalledWith({
      nameSpace: 'H5P',
      event: events.STATEUPDATE,
      data: { state: { 0: { answers: '[1]' } } },
    });
  });
});
