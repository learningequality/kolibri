import Mediator from '../src/mediator';
import LocalStorage from '../src/localStorage';
import { events } from '../src/hashiBase';

describe('LocalStorage hashi shim', () => {
  let localStorage;
  let mediator;
  beforeEach(() => {
    mediator = new Mediator(window);
    localStorage = new LocalStorage(mediator);
  });
  describe('constructor method', () => {
    it('should set an event handler for the STATEUPDATE event', () => {
      expect(mediator.__messageHandlers[localStorage.nameSpace][events.STATEUPDATE]).toEqual([
        localStorage.__setData,
      ]);
    });
    it('should set nameSpace to localStorage', () => {
      expect(localStorage.nameSpace).toEqual('localStorage');
    });
  });
});
