import LocalStorage from '../src/localStorage';
import { createMediator, destroyMediators } from './__fixtures__/mediators';

describe('LocalStorage shim', () => {
  let localStorage;
  beforeEach(() => {
    localStorage = new LocalStorage(createMediator(window));
  });
  afterEach(destroyMediators);
  describe('constructor method', () => {
    it('should set nameSpace to localStorage', () => {
      expect(localStorage.nameSpace).toEqual('localStorage');
    });
  });
});
