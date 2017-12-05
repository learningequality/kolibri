/* eslint-env mocha */
// The following two rules are disabled so that we can use anonymous functions with mocha
// This allows the test instance to be properly referenced with `this`
/* eslint prefer-arrow-callback: "off", func-names: "off" */

import assert from 'assert';
import sinon from 'sinon';
import coreStore from 'kolibri.coreVue.vuex.store';
import { ConnectionSnackbars } from 'kolibri.coreVue.vuex.constants';
import { currentSnackbar, connected, reconnectTime } from 'kolibri.coreVue.vuex.getters';

import { HeartBeat } from '../src/heartbeat.js';
import disconnectionErrorCodes from '../src/disconnectionErrorCodes';

describe('HeartBeat', function() {
  describe('constructor method', function() {
    it('should set the delay property to the first argument', function() {
      const delay = 10000;
      const test = new HeartBeat(delay);
      assert.equal(delay, test.delay);
    });
    it('should raise an error if delay is not a number', function() {
      assert.throws(() => {
        const delay = true;
        this.test = new HeartBeat(delay);
        delete this.test;
      }, ReferenceError);
    });
    it('should set the setActive method to a bound method', function() {
      const test = new HeartBeat();
      assert.ok(HeartBeat.prototype.setActive !== test.setActive);
    });
    it('should set the beat method to a bound method', function() {
      const test = new HeartBeat();
      assert.ok(HeartBeat.prototype.beat !== test.beat);
    });
    it('should call the setInactive method', function() {
      const spy = sinon.spy(HeartBeat.prototype, 'setInactive');
      this.test = new HeartBeat();
      assert.ok(spy.calledOnce);
      spy.restore();
    });
    it('should not call the start method', function() {
      const spy = sinon.spy(HeartBeat.prototype, 'start');
      this.test = new HeartBeat();
      assert.ok(!spy.calledOnce);
      spy.restore();
    });
  });
  describe('beat method', function() {
    beforeEach(function() {
      this.heartBeat = new HeartBeat();
      this.heartBeat.active = false;
      this.store = coreStore.factory();
      this.checkSessionStub = sinon.stub(this.heartBeat, 'checkSession');
      this.checkSessionStub.resolves();
    });
    it('should call setInactive', function() {
      const spy = sinon.spy(this.heartBeat, 'setInactive');
      return this.heartBeat.beat().then(() => {
        assert.ok(spy.calledOnce);
      });
    });
    it('should call wait', function() {
      const spy = sinon.spy(this.heartBeat, 'wait');
      return this.heartBeat.beat().then(() => {
        assert.ok(spy.calledOnce);
      });
    });
    it('should set timerId to a setTimeout identifier', function() {
      return this.heartBeat.beat().then(() => {
        assert.equal(typeof this.heartBeat.timerId, 'number');
      });
    });
    it('should call checkSession', function() {
      this.heartBeat.beat();
      assert.ok(this.checkSessionStub.calledOnce);
    });
    describe('and activity is detected', function() {
      beforeEach(function() {
        this.heartBeat.active = true;
      });
      it('should call setActivityListeners', function() {
        const spy = sinon.spy(this.heartBeat, 'setActivityListeners');
        this.heartBeat.beat();
        assert.ok(spy.calledOnce);
      });
    });
  });
  describe('monitorDisconnect method', function() {
    beforeEach(function() {
      this.heartBeat = new HeartBeat();
      this.wait = sinon.stub(this.heartBeat, 'wait');
      this.store = coreStore.factory();
      this.heartBeat.monitorDisconnect();
    });
    it('should set connected to false', function() {
      assert.equal(connected(this.store.state), false);
    });
    it('should set reconnectTime to not null', function() {
      assert.notEqual(reconnectTime(this.store.state), null);
    });
    it('should set current snackbar to disconnected', function() {
      assert.equal(currentSnackbar(this.store.state), ConnectionSnackbars.DISCONNECTED);
    });
    it('should not do anything if it already knows it is disconnected', function() {
      this.store.dispatch('CORE_SET_RECONNECT_TIME', 'fork');
      this.heartBeat.monitorDisconnect();
      assert.equal(reconnectTime(this.store.state), 'fork');
    });
  });
  describe('checkSession method', function() {
    beforeEach(function() {
      this.heartBeat = new HeartBeat();
      this.urlStub = sinon.stub(this.heartBeat, 'sessionUrl');
      this.urlStub.returns('url');
      this.store = coreStore.factory();
    });
    it('should sign out if an auto logout is detected', function() {
      this.store.dispatch('CORE_SET_SESSION', { userId: 'test' });
      const server = sinon.createFakeServer();
      server.respondWith([
        200,
        { 'Content-Type': 'application/json' },
        JSON.stringify({ user_id: 'nottest' }),
      ]);
      server.autoRespond = true;
      const stub = sinon.stub(this.heartBeat, 'signOutDueToInactivity');
      return this.heartBeat.checkSession().finally(() => {
        assert.ok(stub.calledOnce);
        server.restore();
      });
    });
    describe('when is connected', function() {
      disconnectionErrorCodes.forEach(errorCode => {
        it('should call monitorDisconnect if it receives error code ' + errorCode, function() {
          const monitorStub = sinon.stub(this.heartBeat, 'monitorDisconnect');
          const server = sinon.createFakeServer();
          server.respondWith([errorCode, {}, '']);
          server.autoRespond = true;
          return this.heartBeat.checkSession().finally(() => {
            assert.ok(monitorStub.calledOnce);
            server.restore();
          });
        });
      });
    });
    describe('when not connected', function() {
      beforeEach(function() {
        sinon.stub(this.heartBeat, 'wait');
        this.heartBeat.monitorDisconnect();
      });
      it('should set snackbar to trying to reconnect', function() {
        this.heartBeat.checkSession();
        assert.equal(currentSnackbar(this.store.state), ConnectionSnackbars.TRYING_TO_RECONNECT);
      });
      disconnectionErrorCodes.forEach(errorCode => {
        it('should set snackbar to disconnected for error code ' + errorCode, function() {
          sinon.stub(this.heartBeat, 'monitorDisconnect');
          const server = sinon.createFakeServer();
          server.respondWith([errorCode, {}, '']);
          server.autoRespond = true;
          return this.heartBeat.checkSession().finally(() => {
            assert.equal(currentSnackbar(this.store.state), ConnectionSnackbars.DISCONNECTED);
            server.restore();
          });
        });
      });
      it('should increase the reconnect time when it fails to connect', function() {
        const server = sinon.createFakeServer();
        server.respondWith([0, {}, '']);
        server.autoRespond = true;
        this.store.dispatch('CORE_SET_RECONNECT_TIME', 5);
        return this.heartBeat.checkSession().finally(() => {
          const oldReconnectTime = reconnectTime(this.store.state);
          return this.heartBeat.checkSession().finally(() => {
            assert.ok(reconnectTime(this.store.state) > oldReconnectTime);
            server.restore();
          });
        });
      });
      describe('and then gets reconnected', function() {
        beforeEach(function() {
          this.server = sinon.createFakeServer();
          this.server.respondWith([200, {}, '']);
          this.server.autoRespond = true;
        });
        afterEach(function() {
          this.server.restore();
        });
        it('should set snackbar to reconnected', function() {
          return this.heartBeat.checkSession().finally(() => {
            assert.equal(
              currentSnackbar(this.store.state),
              ConnectionSnackbars.SUCCESSFULLY_RECONNECTED
            );
          });
        });
        it('should set connected to true', function() {
          return this.heartBeat.checkSession().finally(() => {
            assert.ok(connected(this.store.state));
          });
        });
        it('should set reconnect time to null', function() {
          return this.heartBeat.checkSession().finally(() => {
            assert.equal(reconnectTime(this.store.state), null);
          });
        });
      });
    });
  });
});
