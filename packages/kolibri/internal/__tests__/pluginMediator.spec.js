import Vue from 'vue';
import { currentLanguage } from '../../utils/i18n';
import mediatorFactory from '../pluginMediator';

if (!Object.prototype.hasOwnProperty.call(global, 'Intl')) {
  /* eslint-disable import-x/no-commonjs */
  global.Intl = require('intl');
  require('intl/locale-data/jsonp/en.js');
  /* eslint-enable import-x/no-commonjs */
}

describe('Mediator', function () {
  let mediator, facade;
  beforeEach(function () {
    facade = {};
    mediator = mediatorFactory(facade);
  });
  afterEach(function () {
    mediator = undefined;
    facade = undefined;
  });
  describe('kolibriModule registry', function () {
    it('should be empty', function () {
      expect(mediator._kolibriModuleRegistry).toEqual({});
    });
  });
  describe('ready callbacks', function () {
    it('should be an empty array', function () {
      expect(mediator._readyCallbacks).toEqual([]);
    });
  });
  describe('content viewer callbacks', function () {
    it('should be an empty object', function () {
      expect(mediator._contentViewerCallbacks).toEqual({});
    });
  });
  describe('language asset registry', function () {
    it('should be empty', function () {
      expect(mediator._languageAssetRegistry).toEqual({});
    });
  });
  describe('registerKolibriModuleSync method', function () {
    describe('called with invalid input', function () {
      it('should raise a TypeError', function () {
        expect(() => mediator.registerKolibriModuleSync(undefined)).toThrow(TypeError);
      });
    });

    describe('when mediator is already ready', function () {
      it('should call kolibriModule.ready() immediately', function () {
        mediator._ready = true;
        const ready = jest.fn();
        mediator.registerKolibriModuleSync({ name: 'test', ready });
        expect(ready).toHaveBeenCalledTimes(1);
      });
    });

    describe('when mediator is not yet ready', function () {
      it('should not call kolibriModule.ready() immediately', function () {
        mediator._ready = false;
        const ready = jest.fn();
        mediator.registerKolibriModuleSync({ name: 'test', ready });
        expect(ready).not.toHaveBeenCalled();
      });

      it('should call kolibriModule.ready() once setReady() is called', function () {
        mediator._ready = false;
        const ready = jest.fn();
        mediator.registerKolibriModuleSync({ name: 'test', ready });
        mediator.setReady();
        expect(ready).toHaveBeenCalledTimes(1);
      });
    });

    describe('called with valid input', function () {
      it('should register the kolibriModule in the registry', function () {
        mediator._ready = true;
        const mod = { name: 'test', ready: () => {} };
        mediator.registerKolibriModuleSync(mod);
        expect(mediator._kolibriModuleRegistry['test']).toBe(mod);
      });
    });

    describe('when content viewer callbacks are pending for the module', function () {
      it('should flush and clear pending callbacks', function () {
        mediator._ready = true;
        const cb = jest.fn();
        mediator._contentViewerCallbacks['test'] = [cb];
        const mod = { name: 'test', ready: () => {} };
        mediator.registerKolibriModuleSync(mod);
        expect(cb).toHaveBeenCalledWith(mod);
        expect(mediator._contentViewerCallbacks['test']).toBeUndefined();
      });
    });
  });
  describe('setReady method', function () {
    afterEach(function () {
      mediator._ready = false;
      mediator._readyCallbacks = [];
    });

    it('should set _ready to true', function () {
      mediator.setReady();
      expect(mediator._ready).toBe(true);
    });

    it('should flush all pending ready callbacks and clear the array', function () {
      const cb1 = jest.fn();
      const cb2 = jest.fn();
      mediator._readyCallbacks = [cb1, cb2];
      mediator.setReady();
      expect(cb1).toHaveBeenCalledTimes(1);
      expect(cb2).toHaveBeenCalledTimes(1);
      expect(mediator._readyCallbacks).toHaveLength(0);
    });
  });
  describe('registerLanguageAssets method', function () {
    const moduleName = 'test';
    const messageMap = {
      test: 'test message',
      ampersandMessage: 'test &amp; message',
    };
    let spy;
    beforeEach(function () {
      Vue.registerMessages = jest.fn();
      spy = Vue.registerMessages;
      document.body.innerHTML =
        '<template data-i18n="' + moduleName + '">' + JSON.stringify(messageMap) + '</template>';
    });
    afterEach(function () {
      spy.mockRestore();
    });
    it('should call Vue.registerMessages once', function () {
      mediator.registerLanguageAssets(moduleName);
      expect(spy).toHaveBeenCalledTimes(1);
    });
    it('should call Vue.registerMessages with arguments currentLanguage and messageMap', function () {
      mediator.registerLanguageAssets(moduleName);
      expect(spy).toHaveBeenCalledWith(currentLanguage, {
        test: 'test message',
        ampersandMessage: 'test & message',
      });
    });
  });
});
