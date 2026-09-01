import Mediator from '../src/mediator';
import LocalStorage from '../src/localStorage';
import { events } from '../src/base';

describe('LocalStorage shim', () => {
  let localStorage;
  let mediator;
  beforeEach(() => {
    mediator = new Mediator(window);
    localStorage = new LocalStorage(mediator);
  });
  describe('constructor method', () => {
    it('should store state pushed to it on the STATEUPDATE event', () => {
      mediator.handleMessage({
        data: {
          nameSpace: localStorage.nameSpace,
          event: events.STATEUPDATE,
          data: { test: 'test' },
        },
      });
      expect(localStorage.data).toEqual({ test: 'test' });
    });
    it('should set nameSpace to localStorage', () => {
      expect(localStorage.nameSpace).toEqual('localStorage');
    });
  });
});
