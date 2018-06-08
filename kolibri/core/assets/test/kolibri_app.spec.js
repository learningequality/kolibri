import store from 'kolibri.coreVue.vuex.store';
import KolibriApp from '../src/kolibri_app';

const mockRegisterModule = store.registerModule;
jest.mock(
  'kolibri',
  () => {
    return {
      registerKolibriModuleSync: jest.fn(),
    };
  },
  { virtual: true }
);

jest.mock('kolibri.coreVue.vuex.store', () => {
  return {
    registerModule: jest.fn(),
  };
});

describe('KolibriApp', function() {
  let app;
  describe('ready method', function() {
    beforeEach(function() {
      app = new KolibriApp();
    });
    it('should call store registerModule', function() {
      app.ready();
      expect(mockRegisterModule.mock.calls).toHaveLength(1);
    });
    it('should call store registerModule with app state and mutations', function() {
      app.ready();
      expect(mockRegisterModule.mock.calls[0][0]).toEqual({
        state: app.initialState,
        mutations: app.mutations,
      });
    });
  });
});
