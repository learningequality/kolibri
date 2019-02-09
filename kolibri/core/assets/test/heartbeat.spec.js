import coreStore from 'kolibri.coreVue.vuex.store';
import { HeartBeat } from '../src/heartbeat.js';
import disconnectionErrorCodes from '../src/disconnectionErrorCodes';
import { trs } from '../src/disconnection';

jest.mock('kolibri.lib.logging');
jest.mock('lockr');
jest.mock('http');

describe('HeartBeat', function() {
  describe('constructor method', function() {
    it('should set the setActive method to a bound method', function() {
      const test = new HeartBeat();
      expect(HeartBeat.prototype.setActive).not.toEqual(test.setActive);
    });
    it('should set the beat method to a bound method', function() {
      const test = new HeartBeat();
      expect(HeartBeat.prototype.beat).not.toEqual(test.beat);
    });
    it('should call the setInactive method', function() {
      const spy = jest.spyOn(HeartBeat.prototype, 'setInactive');
      new HeartBeat();
      expect(spy).toHaveBeenCalledTimes(1);
      spy.mockRestore();
    });
    it('should not call the start method', function() {
      const spy = jest.spyOn(HeartBeat.prototype, 'start');
      new HeartBeat();
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });
  describe('beat method', function() {
    let heartBeat;
    let checkSessionStub;
    beforeEach(function() {
      heartBeat = new HeartBeat();
      heartBeat.active = false;
      heartBeat.enabled = true;
      checkSessionStub = jest.spyOn(heartBeat, 'checkSession').mockReturnValue(Promise.resolve());
    });
    it('should call setInactive', function() {
      const spy = jest.spyOn(heartBeat, 'setInactive');
      return heartBeat.beat().then(() => {
        expect(spy).toHaveBeenCalledTimes(1);
      });
    });
    it('should call wait', function() {
      const spy = jest.spyOn(heartBeat, 'wait');
      return heartBeat.beat().then(() => {
        expect(spy).toHaveBeenCalledTimes(1);
      });
    });
    it('should set timerId to a setTimeout identifier', function() {
      return heartBeat.beat().then(() => {
        expect(typeof heartBeat.timerId).toEqual('number');
      });
    });
    it('should call checkSession', function() {
      heartBeat.beat();
      expect(checkSessionStub).toHaveBeenCalledTimes(1);
    });
    describe('and activity is detected', function() {
      beforeEach(function() {
        heartBeat.active = true;
      });
      it('should call setActivityListeners', function() {
        const spy = jest.spyOn(heartBeat, 'setActivityListeners');
        heartBeat.beat();
        expect(spy).toHaveBeenCalledTimes(1);
      });
    });
  });
  describe('monitorDisconnect method', function() {
    let heartBeat;
    beforeEach(function() {
      heartBeat = new HeartBeat();
      jest.spyOn(heartBeat, 'wait').mockImplementation(() => {});
      heartBeat.monitorDisconnect();
    });
    it('should set connected to false', function() {
      expect(coreStore.getters.connected).toEqual(false);
    });
    it('should set reconnectTime to not null', function() {
      expect(coreStore.getters.reconnectTime).not.toEqual(null);
    });
    it('should set current snackbar to disconnected', function() {
      expect(coreStore.getters.snackbarIsVisible).toEqual(true);
      expect(
        coreStore.getters.snackbarOptions.text.startsWith(
          'Disconnected from server. Will try to reconnect in'
        )
      ).toEqual(true);
    });
    it('should not do anything if it already knows it is disconnected', function() {
      coreStore.commit('CORE_SET_RECONNECT_TIME', 'fork');
      heartBeat.monitorDisconnect();
      expect(coreStore.getters.reconnectTime).toEqual('fork');
    });
  });
  describe('checkSession method', function() {
    let heartBeat;
    beforeEach(function() {
      heartBeat = new HeartBeat();
      jest.spyOn(heartBeat, 'sessionUrl').mockReturnValue('url');
    });
    it('should sign out if an auto logout is detected', function() {
      coreStore.commit('CORE_SET_SESSION', { user_id: 'test', id: 'current' });
      const http = require('http');
      http.__setCode(200);
      http.__setHeaders({ 'Content-Type': 'application/json' });
      http.__setEntity({ user_id: 'nottest', id: 'current' });
      const stub = jest.spyOn(heartBeat, 'signOutDueToInactivity');
      return heartBeat.checkSession().finally(() => {
        expect(stub).toHaveBeenCalledTimes(1);
      });
    });
    it('should not sign out if user_id changes but session is being set for first time', function() {
      coreStore.commit('CORE_SET_SESSION', { user_id: undefined, id: undefined });
      const http = require('http');
      http.__setCode(200);
      http.__setHeaders({ 'Content-Type': 'application/json' });
      http.__setEntity({ user_id: 'nottest', id: 'current' });
      const stub = jest.spyOn(heartBeat, 'signOutDueToInactivity');
      return heartBeat.checkSession().finally(() => {
        expect(stub).toHaveBeenCalledTimes(0);
      });
    });
    describe('when is connected', function() {
      // Don't test for 0, as it is not a real error code.
      // Rather it is the status code that our request client library returns
      // when the connection is refused by the host, or is otherwise unable to connect.
      // What happens for a zero code is tested later in this file.
      disconnectionErrorCodes.filter(code => code !== 0).forEach(errorCode => {
        it('should call monitorDisconnect if it receives error code ' + errorCode, function() {
          const monitorStub = jest.spyOn(heartBeat, 'monitorDisconnect');
          const http = require('http');
          http.__setCode(errorCode);
          http.__setHeaders({ 'Content-Type': 'application/json' });
          return heartBeat.checkSession().finally(() => {
            expect(monitorStub).toHaveBeenCalledTimes(1);
          });
        });
      });
    });
    describe('when not connected', function() {
      beforeEach(function() {
        const http = require('http');
        http.__setCode(0);
        http.__setHeaders({ 'Content-Type': 'application/json' });
        jest.spyOn(heartBeat, 'wait');
        heartBeat.monitorDisconnect();
      });
      it('should set snackbar to trying to reconnect', function() {
        heartBeat.checkSession();
        expect(coreStore.getters.snackbarIsVisible).toEqual(true);
        expect(coreStore.getters.snackbarOptions.text).toEqual(trs.$tr('tryingToReconnect'));
      });
      disconnectionErrorCodes.forEach(errorCode => {
        it('should set snackbar to disconnected for error code ' + errorCode, function() {
          jest.spyOn(heartBeat, 'monitorDisconnect');
          const http = require('http');
          http.__setCode(errorCode);
          http.__setHeaders({ 'Content-Type': 'application/json' });
          return heartBeat.checkSession().finally(() => {
            expect(coreStore.getters.snackbarIsVisible).toEqual(true);
            expect(
              coreStore.getters.snackbarOptions.text.startsWith(
                'Disconnected from server. Will try to reconnect in'
              )
            ).toEqual(true);
          });
        });
      });
      it('should increase the reconnect time when it fails to connect', function() {
        const http = require('http');
        http.__setCode(0);
        http.__setHeaders({ 'Content-Type': 'application/json' });
        coreStore.commit('CORE_SET_RECONNECT_TIME', 5);
        return heartBeat.checkSession().finally(() => {
          const oldReconnectTime = coreStore.getters.reconnectTime;
          return heartBeat.checkSession().finally(() => {
            expect(coreStore.getters.reconnectTime).toBeGreaterThan(oldReconnectTime);
          });
        });
      });
      describe('and then gets reconnected', function() {
        beforeEach(function() {
          const http = require('http');
          http.__setCode(200);
          http.__setHeaders({ 'Content-Type': 'application/json' });
        });
        it('should set snackbar to reconnected', function() {
          return heartBeat.checkSession().finally(() => {
            expect(coreStore.getters.snackbarIsVisible).toEqual(true);
            expect(coreStore.getters.snackbarOptions.text).toEqual(
              trs.$tr('successfullyReconnected')
            );
          });
        });
        it('should set connected to true', function() {
          return heartBeat.checkSession().finally(() => {
            expect(coreStore.getters.connected).toEqual(true);
          });
        });
        it('should set reconnect time to null', function() {
          return heartBeat.checkSession().finally(() => {
            expect(coreStore.getters.reconnectTime).toEqual(null);
          });
        });
      });
    });
  });
});
