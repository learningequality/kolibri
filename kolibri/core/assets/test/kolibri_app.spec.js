/* eslint-env mocha */
import sinon from 'sinon';
import KolibriApp from '../src/kolibri_app';

describe('KolibriApp', function() {
  describe('ready method', function() {
    beforeEach(function() {
      window.kolibriGlobal.registerKolibriModuleSync = sinon.spy();
      this.app = new KolibriApp();
      this.registerModuleStub = sinon.stub();
      this.store = {
        registerModule: this.registerModuleStub,
      };
      sinon.stub(this.app, 'store').get(() => this.store);
    });
    afterEach(function() {
      delete window.kolibriGlobal.registerKolibriModuleSync;
    });
    it('should call store registerModule', function() {
      this.app.ready();
      sinon.assert.calledOnce(this.registerModuleStub);
    });
    it('should call store registerModule with app state and mutations', function() {
      this.app.ready();
      sinon.assert.calledWith(
        this.registerModuleStub,
        sinon.match({ state: this.app.initialState, mutations: this.app.mutations })
      );
    });
  });
});
