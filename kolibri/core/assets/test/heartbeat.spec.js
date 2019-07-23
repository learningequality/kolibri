import coreStore from 'kolibri.coreVue.vuex.store';
import * as browser from 'kolibri.utils.browser';
import * as serverClock from 'kolibri.utils.serverClock';
import { HeartBeat } from '../src/heartbeat.js';
import disconnectionErrorCodes from '../src/disconnectionErrorCodes';
import { trs } from '../src/disconnection';

jest.mock('kolibri.lib.logging');
jest.mock('kolibri.urls');
jest.mock('lockr');
jest.mock('http');

describe('HeartBeat', function() {
  describe('constructor method', function() {
    it('should set the setUserActive method to a bound method', function() {
      const test = new HeartBeat();
      expect(HeartBeat.prototype.setUserActive).not.toEqual(test.setUserActive);
    });
    it('should set the pollSessionEndPoint method to a bound method', function() {
      const test = new HeartBeat();
      expect(HeartBeat.prototype.pollSessionEndPoint).not.toEqual(test.pollSessionEndPoint);
    });
    it('should call the setUserInactive method', function() {
      const spy = jest.spyOn(HeartBeat.prototype, 'setUserInactive');
      new HeartBeat();
      expect(spy).toHaveBeenCalledTimes(1);
      spy.mockRestore();
    });
    it('should not call the startPolling method', function() {
      const spy = jest.spyOn(HeartBeat.prototype, 'startPolling');
      new HeartBeat();
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });
  describe('startPolling method', function() {
    let heartBeat;
    let pollSessionEndPointStub;
    beforeEach(function() {
      heartBeat = new HeartBeat();
      pollSessionEndPointStub = jest
        .spyOn(heartBeat, 'pollSessionEndPoint')
        .mockReturnValue(Promise.resolve());
    });
    it('should call pollSessionEndPoint if not currently enabled', function() {
      heartBeat._enabled = false;
      heartBeat.startPolling();
      expect(pollSessionEndPointStub).toHaveBeenCalledTimes(1);
    });
    it('should not call pollSessionEndPoint if currently enabled', function() {
      heartBeat._enabled = true;
      heartBeat.startPolling();
      expect(pollSessionEndPointStub).toHaveBeenCalledTimes(0);
    });
    it('should return _activePromise if currently defined and _enabled true', function() {
      heartBeat._enabled = true;
      heartBeat._activePromise = 'test';
      expect(heartBeat.startPolling()).toEqual('test');
    });
    it('should return a Promise if _activePromise is not defined and _enabled is true', function() {
      heartBeat._enabled = true;
      delete heartBeat._activePromise;
      expect(heartBeat.startPolling()).toBeInstanceOf(Promise);
    });
  });
  describe('pollSessionEndPoint method', function() {
    let heartBeat;
    let _checkSessionStub;
    beforeEach(function() {
      heartBeat = new HeartBeat();
      heartBeat.active = false;
      heartBeat._enabled = true;
      _checkSessionStub = jest.spyOn(heartBeat, '_checkSession').mockReturnValue(Promise.resolve());
    });
    it('should call setUserInactive', function() {
      const spy = jest.spyOn(heartBeat, 'setUserInactive');
      return heartBeat.pollSessionEndPoint().then(() => {
        expect(spy).toHaveBeenCalledTimes(1);
      });
    });
    it('should call _wait', function() {
      const spy = jest.spyOn(heartBeat, '_wait');
      return heartBeat.pollSessionEndPoint().then(() => {
        expect(spy).toHaveBeenCalledTimes(1);
      });
    });
    it('should set _timerId to a setTimeout identifier', function() {
      return heartBeat.pollSessionEndPoint().then(() => {
        expect(typeof heartBeat._timerId).toEqual('number');
      });
    });
    it('should call _checkSession if no _activePromise property', function() {
      heartBeat.pollSessionEndPoint();
      expect(_checkSessionStub).toHaveBeenCalledTimes(1);
    });
    it('should call remove _activePromise property once the session check is complete', function() {
      return heartBeat.pollSessionEndPoint().then(() => {
        expect(heartBeat._activePromise).toBeUndefined();
      });
    });
    it('should call setUserInactive once the session check is complete if enabled', function() {
      const setUserInactiveStub = jest.spyOn(heartBeat, 'setUserInactive');
      heartBeat._enabled = true;
      return heartBeat.pollSessionEndPoint().then(() => {
        expect(setUserInactiveStub).toHaveBeenCalledTimes(1);
      });
    });
    it('should not call setUserInactive once the session check is complete if not enabled', function() {
      const setUserInactiveStub = jest.spyOn(heartBeat, 'setUserInactive');
      heartBeat._enabled = false;
      return heartBeat.pollSessionEndPoint().then(() => {
        expect(setUserInactiveStub).toHaveBeenCalledTimes(0);
      });
    });
    it('should call _wait once the session check is complete if enabled', function() {
      const _waitStub = jest.spyOn(heartBeat, '_wait');
      heartBeat._enabled = true;
      return heartBeat.pollSessionEndPoint().then(() => {
        expect(_waitStub).toHaveBeenCalledTimes(1);
      });
    });
    it('should not call _wait once the session check is complete if not enabled', function() {
      const _waitStub = jest.spyOn(heartBeat, '_wait');
      heartBeat._enabled = false;
      return heartBeat.pollSessionEndPoint().then(() => {
        expect(_waitStub).toHaveBeenCalledTimes(0);
      });
    });
    it('should not call _checkSession if there is an _activePromise property', function() {
      heartBeat._activePromise = Promise.resolve();
      heartBeat.pollSessionEndPoint();
      expect(_checkSessionStub).toHaveBeenCalledTimes(0);
    });
    describe('and activity is detected', function() {
      beforeEach(function() {
        heartBeat._active = true;
      });
      it('should call _setActivityListeners', function() {
        const spy = jest.spyOn(heartBeat, '_setActivityListeners');
        heartBeat.pollSessionEndPoint();
        expect(spy).toHaveBeenCalledTimes(1);
      });
    });
  });
  describe('monitorDisconnect method', function() {
    let heartBeat;
    beforeEach(function() {
      heartBeat = new HeartBeat();
      jest.spyOn(heartBeat, '_wait').mockImplementation(() => {});
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
  describe('_checkSession method', function() {
    let heartBeat;
    beforeEach(function() {
      heartBeat = new HeartBeat();
      jest.spyOn(heartBeat, '_sessionUrl').mockReturnValue('url');
    });
    it('should sign out if an auto logout is detected', function() {
      coreStore.commit('CORE_SET_SESSION', { user_id: 'test', id: 'current' });
      const http = require('http');
      http.__setCode(200);
      http.__setHeaders({ 'Content-Type': 'application/json' });
      http.__setEntity({ user_id: null, id: 'current' });
      const stub = jest.spyOn(heartBeat, 'signOutDueToInactivity');
      return heartBeat._checkSession().finally(() => {
        expect(stub).toHaveBeenCalledTimes(1);
      });
    });
    it('should redirect if a change in user is detected', function() {
      coreStore.commit('CORE_SET_SESSION', { user_id: 'test', id: 'current' });
      const http = require('http');
      http.__setCode(200);
      http.__setHeaders({ 'Content-Type': 'application/json' });
      http.__setEntity({ user_id: 'nottest', id: 'current' });
      const redirectStub = jest.spyOn(browser, 'redirectBrowser');
      return heartBeat._checkSession().finally(() => {
        expect(redirectStub).toHaveBeenCalledTimes(1);
      });
    });
    it('should not sign out if user_id changes but session is being set for first time', function() {
      coreStore.commit('CORE_SET_SESSION', { user_id: undefined, id: undefined });
      const http = require('http');
      http.__setCode(200);
      http.__setHeaders({ 'Content-Type': 'application/json' });
      http.__setEntity({ user_id: null, id: 'current' });
      const stub = jest.spyOn(heartBeat, 'signOutDueToInactivity');
      return heartBeat._checkSession().finally(() => {
        expect(stub).toHaveBeenCalledTimes(0);
      });
    });
    it('should call setServerTime with a clientNow value that is between the start and finish of the poll', function() {
      coreStore.commit('CORE_SET_SESSION', { user_id: 'test', id: 'current' });
      const http = require('http');
      http.__setCode(200);
      http.__setHeaders({ 'Content-Type': 'application/json' });
      const serverTime = new Date().toJSON();
      http.__setEntity({ user_id: 'test', id: 'current', server_time: serverTime });
      const stub = jest.spyOn(serverClock, 'setServerTime');
      const start = new Date();
      return heartBeat._checkSession().finally(() => {
        const end = new Date();
        expect(stub.mock.calls[0][0]).toEqual(serverTime);
        expect(stub.mock.calls[0][1].getTime()).toBeGreaterThan(start.getTime());
        expect(stub.mock.calls[0][1].getTime()).toBeLessThan(end.getTime());
      });
    });
    describe('when is connected', function() {
      // Don't test for 0, as it is not a real error code.
      // Rather it is the status code that our request client library returns
      // when the connection is refused by the host, or is otherwise unable to connect.
      // What happens for a zero code is tested later in this file.
      disconnectionErrorCodes
        .filter(code => code !== 0)
        .forEach(errorCode => {
          it('should call monitorDisconnect if it receives error code ' + errorCode, function() {
            const monitorStub = jest.spyOn(heartBeat, 'monitorDisconnect');
            const http = require('http');
            http.__setCode(errorCode);
            http.__setHeaders({ 'Content-Type': 'application/json' });
            return heartBeat._checkSession().finally(() => {
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
        jest.spyOn(heartBeat, '_wait');
        heartBeat.monitorDisconnect();
      });
      it('should set snackbar to trying to reconnect', function() {
        heartBeat._checkSession();
        expect(coreStore.getters.snackbarIsVisible).toEqual(true);
        expect(coreStore.getters.snackbarOptions.text).toEqual(trs.$tr('tryingToReconnect'));
      });
      disconnectionErrorCodes.forEach(errorCode => {
        it('should set snackbar to disconnected for error code ' + errorCode, function() {
          jest.spyOn(heartBeat, 'monitorDisconnect');
          const http = require('http');
          http.__setCode(errorCode);
          http.__setHeaders({ 'Content-Type': 'application/json' });
          return heartBeat._checkSession().finally(() => {
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
        return heartBeat._checkSession().finally(() => {
          const oldReconnectTime = coreStore.getters.reconnectTime;
          return heartBeat._checkSession().finally(() => {
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
          return heartBeat._checkSession().finally(() => {
            expect(coreStore.getters.snackbarIsVisible).toEqual(true);
            expect(coreStore.getters.snackbarOptions.text).toEqual(
              trs.$tr('successfullyReconnected')
            );
          });
        });
        it('should set connected to true', function() {
          return heartBeat._checkSession().finally(() => {
            expect(coreStore.getters.connected).toEqual(true);
          });
        });
        it('should set reconnect time to null', function() {
          return heartBeat._checkSession().finally(() => {
            expect(coreStore.getters.reconnectTime).toEqual(null);
          });
        });
      });
    });
  });
});
