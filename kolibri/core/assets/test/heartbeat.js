/* eslint-env mocha */
import { expect } from 'chai';
import sinon from 'sinon';
import coreStore from 'kolibri.coreVue.vuex.store';
import {
  snackbarIsVisible,
  snackbarOptions,
  connected,
  reconnectTime,
} from 'kolibri.coreVue.vuex.getters';
import { setUpVueIntl } from 'kolibri.utils.i18n';
import { HeartBeat } from '../src/heartbeat.js';
import disconnectionErrorCodes from '../src/disconnectionErrorCodes';
import { trs } from '../src/disconnection';

describe('HeartBeat', function() {
  // TODO: Make this more general so it is set up for all tests
  beforeEach(function() {
    setUpVueIntl();
  });
  describe('constructor method', function() {
    it('should set the delay property to the first argument', function() {
      const delay = 10000;
      const test = new HeartBeat(delay);
      expect(delay).to.equal(test.delay);
    });
    it('should raise an error if delay is not a number', function() {
      function testCall() {
        const delay = true;
        this.test = new HeartBeat(delay);
        delete this.test;
      }
      expect(testCall).to.throw(ReferenceError);
    });
    it('should set the setActive method to a bound method', function() {
      const test = new HeartBeat();
      expect(HeartBeat.prototype.setActive).to.not.equal(test.setActive);
    });
    it('should set the beat method to a bound method', function() {
      const test = new HeartBeat();
      expect(HeartBeat.prototype.beat).to.not.equal(test.beat);
    });
    it('should call the setInactive method', function() {
      const spy = sinon.spy(HeartBeat.prototype, 'setInactive');
      this.test = new HeartBeat();
      sinon.assert.calledOnce(spy);
      spy.restore();
    });
    it('should not call the start method', function() {
      const spy = sinon.spy(HeartBeat.prototype, 'start');
      this.test = new HeartBeat();
      sinon.assert.notCalled(spy);
      spy.restore();
    });
  });
  describe('beat method', function() {
    beforeEach(function() {
      this.heartBeat = new HeartBeat();
      this.heartBeat.active = false;
      this.heartBeat.enabled = true;
      this.store = coreStore.factory();
      this.checkSessionStub = sinon.stub(this.heartBeat, 'checkSession');
      this.checkSessionStub.resolves();
    });
    it('should call setInactive', function() {
      const spy = sinon.spy(this.heartBeat, 'setInactive');
      return this.heartBeat.beat().then(() => {
        sinon.assert.calledOnce(spy);
      });
    });
    it('should call wait', function() {
      const spy = sinon.spy(this.heartBeat, 'wait');
      return this.heartBeat.beat().then(() => {
        sinon.assert.calledOnce(spy);
      });
    });
    it('should set timerId to a setTimeout identifier', function() {
      return this.heartBeat.beat().then(() => {
        expect(typeof this.heartBeat.timerId).to.equal('number');
      });
    });
    it('should call checkSession', function() {
      this.heartBeat.beat();
      sinon.assert.calledOnce(this.checkSessionStub);
    });
    describe('and activity is detected', function() {
      beforeEach(function() {
        this.heartBeat.active = true;
      });
      it('should call setActivityListeners', function() {
        const spy = sinon.spy(this.heartBeat, 'setActivityListeners');
        this.heartBeat.beat();
        sinon.assert.calledOnce(spy);
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
      expect(connected(this.store.state)).to.be.false;
    });
    it('should set reconnectTime to not null', function() {
      expect(reconnectTime(this.store.state)).to.not.equal(null);
    });
    it('should set current snackbar to disconnected', function() {
      expect(snackbarIsVisible(this.store.state)).to.be.true;
      expect(
        snackbarOptions(this.store.state).text.startsWith(
          'Disconnected from server. Will try to reconnect in'
        )
      ).to.be.true;
    });
    it('should not do anything if it already knows it is disconnected', function() {
      this.store.dispatch('CORE_SET_RECONNECT_TIME', 'fork');
      this.heartBeat.monitorDisconnect();
      expect(reconnectTime(this.store.state)).to.equal('fork');
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
        sinon.assert.calledOnce(stub);
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
            sinon.assert.calledOnce(monitorStub);
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
        expect(snackbarIsVisible(this.store.state)).to.be.true;
        expect(snackbarOptions(this.store.state).text).to.equal(trs.$tr('tryingToReconnect'));
      });
      disconnectionErrorCodes.forEach(errorCode => {
        it('should set snackbar to disconnected for error code ' + errorCode, function() {
          sinon.stub(this.heartBeat, 'monitorDisconnect');
          const server = sinon.createFakeServer();
          server.respondWith([errorCode, {}, '']);
          server.autoRespond = true;
          return this.heartBeat.checkSession().finally(() => {
            expect(snackbarIsVisible(this.store.state)).to.be.true;
            expect(
              snackbarOptions(this.store.state).text.startsWith(
                'Disconnected from server. Will try to reconnect in'
              )
            ).to.be.true;
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
            expect(reconnectTime(this.store.state)).to.be.above(oldReconnectTime);
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
            expect(snackbarIsVisible(this.store.state)).to.be.true;
            expect(snackbarOptions(this.store.state).text).to.equal(
              trs.$tr('successfullyReconnected')
            );
          });
        });
        it('should set connected to true', function() {
          return this.heartBeat.checkSession().finally(() => {
            expect(connected(this.store.state)).to.be.true;
          });
        });
        it('should set reconnect time to null', function() {
          return this.heartBeat.checkSession().finally(() => {
            expect(reconnectTime(this.store.state)).to.equal(null);
          });
        });
      });
    });
  });
});
