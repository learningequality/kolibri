/* eslint-env mocha */
// The following two rules are disabled so that we can use anonymous functions with mocha
// This allows the test instance to be properly referenced with `this`
/* eslint prefer-arrow-callback: "off", func-names: "off" */

import assert from 'assert';
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
      assert(this.registerModuleStub.calledOnce);
    });
    it('should call store registerModule with app state and mutations', function() {
      this.app.ready();
      assert(
        this.registerModuleStub.calledWith(
          sinon.match({ state: this.app.initialState, mutations: this.app.mutations })
        )
      );
    });
  });
});
