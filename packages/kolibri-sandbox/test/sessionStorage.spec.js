import Mediator from '../src/mediator';
import SessionStorage from '../src/sessionStorage';

describe('SessionStorage shim', () => {
  let sessionStorage;
  let mediator;
  beforeEach(() => {
    mediator = new Mediator(window);
    sessionStorage = new SessionStorage(mediator);
  });
  afterEach(() => {
    mediator.destroy();
  });
  describe('constructor method', () => {
    it('should set nameSpace to sessionStorage', () => {
      expect(sessionStorage.nameSpace).toEqual('sessionStorage');
    });
  });
  describe('non-persistence', () => {
    it('should not send its state back to main', () => {
      mediator.sendMessage = jest.fn();

      sessionStorage.stateUpdated();

      expect(mediator.sendMessage).not.toHaveBeenCalled();
    });
  });
});
