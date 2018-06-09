import sinon from 'sinon';
import coreStore from 'kolibri.coreVue.vuex.store';
import {
  snackbarIsVisible,
  snackbarOptions,
  connected,
  reconnectTime,
} from 'kolibri.coreVue.vuex.getters';
import { HeartBeat } from '../src/heartbeat.js';
import disconnectionErrorCodes from '../src/disconnectionErrorCodes';
import { trs } from '../src/disconnection';

jest.mock('http');

describe('HeartBeat', function() {
  let heartBeat, store;
  describe('constructor method', function() {
    it('should set the delay property to the first argument', function() {
      const delay = 10000;
      const test = new HeartBeat(delay);
      expect(delay).toEqual(test.delay);
    });
    it('should raise an error if delay is not a number', function() {
      function testCall() {
        const delay = true;
        new HeartBeat(delay);
      }
      expect(testCall).toThrow(ReferenceError);
    });
    it('should set the setActive method to a bound method', function() {
      const test = new HeartBeat();
      expect(HeartBeat.prototype.setActive).not.toEqual(test.setActive);
    });
    it('should set the beat method to a bound method', function() {
      const test = new HeartBeat();
      expect(HeartBeat.prototype.beat).not.toEqual(test.beat);
    });
    it('should call the setInactive method', function() {
      const spy = sinon.spy(HeartBeat.prototype, 'setInactive');
      new HeartBeat();
      sinon.assert.calledOnce(spy);
      spy.restore();
    });
    it('should not call the start method', function() {
      const spy = sinon.spy(HeartBeat.prototype, 'start');
      new HeartBeat();
      sinon.assert.notCalled(spy);
      spy.restore();
    });
  });
  describe('beat method', function() {
    let checkSessionStub;
    beforeEach(function() {
      heartBeat = new HeartBeat();
      heartBeat.active = false;
      coreStore.factory();
      checkSessionStub = sinon.stub(heartBeat, 'checkSession');
      checkSessionStub.resolves();
    });
    it('should call setInactive', function() {
      const spy = sinon.spy(heartBeat, 'setInactive');
      return heartBeat.beat().then(() => {
        sinon.assert.calledOnce(spy);
      });
    });
    it('should call wait', function() {
      const spy = sinon.spy(heartBeat, 'wait');
      return heartBeat.beat().then(() => {
        sinon.assert.calledOnce(spy);
      });
    });
    it('should set timerId to a setTimeout identifier', function() {
      return heartBeat.beat().then(() => {
        expect(typeof heartBeat.timerId).toEqual('number');
      });
    });
    it('should call checkSession', function() {
      heartBeat.beat();
      sinon.assert.calledOnce(checkSessionStub);
    });
    describe('and activity is detected', function() {
      beforeEach(function() {
        heartBeat.active = true;
      });
      it('should call setActivityListeners', function() {
        const spy = sinon.spy(heartBeat, 'setActivityListeners');
        heartBeat.beat();
        sinon.assert.calledOnce(spy);
      });
    });
  });
  describe('monitorDisconnect method', function() {
    beforeEach(function() {
      heartBeat = new HeartBeat();
      sinon.stub(heartBeat, 'wait');
      store = coreStore.factory();
      heartBeat.monitorDisconnect();
    });
    it('should set connected to false', function() {
      expect(connected(store.state)).toEqual(false);
    });
    it('should set reconnectTime to not null', function() {
      expect(reconnectTime(store.state)).not.toEqual(null);
    });
    it('should set current snackbar to disconnected', function() {
      expect(snackbarIsVisible(store.state)).toEqual(true);
      expect(
        snackbarOptions(store.state).text.startsWith(
          'Disconnected from server. Will try to reconnect in'
        )
      ).toEqual(true);
    });
    it('should not do anything if it already knows it is disconnected', function() {
      store.dispatch('CORE_SET_RECONNECT_TIME', 'fork');
      heartBeat.monitorDisconnect();
      expect(reconnectTime(store.state)).toEqual('fork');
    });
  });
  describe('checkSession method', function() {
    beforeEach(function() {
      heartBeat = new HeartBeat();
      const urlStub = sinon.stub(heartBeat, 'sessionUrl');
      urlStub.returns('url');
      store = coreStore.factory();
    });
    it('should sign out if an auto logout is detected', function() {
      store.dispatch('CORE_SET_SESSION', { userId: 'test' });
      const http = require('http');
      http.__setCode(200);
      http.__setHeaders({ 'Content-Type': 'application/json' });
      http.__setEntity({ user_id: 'nottest' });
      const stub = sinon.stub(heartBeat, 'signOutDueToInactivity');
      return heartBeat.checkSession().finally(() => {
        sinon.assert.calledOnce(stub);
      });
    });
    describe('when is connected', function() {
      // Don't test for 0, as it is not a real error code.
      // Rather it is the status code that our request client library returns
      // when the connection is refused by the host, or is otherwise unable to connect.
      // What happens for a zero code is tested later in this file.
      disconnectionErrorCodes.filter(code => code !== 0).forEach(errorCode => {
        it('should call monitorDisconnect if it receives error code ' + errorCode, function() {
          const monitorStub = sinon.stub(heartBeat, 'monitorDisconnect');
          const http = require('http');
          http.__setCode(errorCode);
          http.__setHeaders({ 'Content-Type': 'application/json' });
          return heartBeat.checkSession().finally(() => {
            sinon.assert.calledOnce(monitorStub);
          });
        });
      });
    });
    describe('when not connected', function() {
      beforeEach(function() {
        const http = require('http');
        http.__setCode(0);
        http.__setHeaders({ 'Content-Type': 'application/json' });
        sinon.stub(heartBeat, 'wait');
        heartBeat.monitorDisconnect();
      });
      it('should set snackbar to trying to reconnect', function() {
        heartBeat.checkSession();
        expect(snackbarIsVisible(store.state)).toEqual(true);
        expect(snackbarOptions(store.state).text).toEqual(trs.$tr('tryingToReconnect'));
      });
      disconnectionErrorCodes.forEach(errorCode => {
        it('should set snackbar to disconnected for error code ' + errorCode, function() {
          sinon.stub(heartBeat, 'monitorDisconnect');
          const http = require('http');
          http.__setCode(errorCode);
          http.__setHeaders({ 'Content-Type': 'application/json' });
          return heartBeat.checkSession().finally(() => {
            expect(snackbarIsVisible(store.state)).toEqual(true);
            expect(
              snackbarOptions(store.state).text.startsWith(
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
        store.dispatch('CORE_SET_RECONNECT_TIME', 5);
        return heartBeat.checkSession().finally(() => {
          const oldReconnectTime = reconnectTime(store.state);
          return heartBeat.checkSession().finally(() => {
            expect(reconnectTime(store.state)).toBeGreaterThan(oldReconnectTime);
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
            expect(snackbarIsVisible(store.state)).toEqual(true);
            expect(snackbarOptions(store.state).text).toEqual(trs.$tr('successfullyReconnected'));
          });
        });
        it('should set connected to true', function() {
          return heartBeat.checkSession().finally(() => {
            expect(connected(store.state)).toEqual(true);
          });
        });
        it('should set reconnect time to null', function() {
          return heartBeat.checkSession().finally(() => {
            expect(reconnectTime(store.state)).toEqual(null);
          });
        });
      });
    });
  });
});
