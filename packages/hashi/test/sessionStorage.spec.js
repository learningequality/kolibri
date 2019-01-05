import Mediator from '../src/mediator';
import SessionStorage from '../src/sessionStorage';

describe('SessionStorage hashi shim', () => {
  let sessionStorage;
  let mediator;
  beforeEach(() => {
    mediator = new Mediator(window);
    sessionStorage = new SessionStorage(mediator);
  });
  describe('constructor method', () => {
    it('should set nameSpace to sessionStorage', () => {
      expect(sessionStorage.nameSpace).toEqual('sessionStorage');
    });
  });
});
