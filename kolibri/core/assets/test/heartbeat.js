/* eslint-env mocha */
// The following two rules are disabled so that we can use anonymous functions with mocha
// This allows the test instance to be properly referenced with `this`
/* eslint prefer-arrow-callback: "off", func-names: "off" */

'use strict';

const assert = require('assert');
const rewire = require('rewire');
const sinon = require('sinon');

const HeartBeat = rewire('../src/heartbeat.js');

describe('HeartBeat', function () {
  describe('constructor method', function () {
    it('should raise an error if no Kolibri object is passed in', function () {
      assert.throws(() => {
        this.test = new HeartBeat();
        delete this.test;
      }, ReferenceError);
    });
    it('should set the kolibri property to the first argument', function () {
      const kolibri = {};
      const test = new HeartBeat(kolibri);
      assert.equal(kolibri, test.kolibri);
    });
    it('should set the delay property to the second argument', function () {
      const delay = 10000;
      const test = new HeartBeat({}, delay);
      assert.equal(delay, test.delay);
    });
    it('should raise an error if delay is not a number', function () {
      assert.throws(() => {
        const delay = true;
        this.test = new HeartBeat({}, delay);
        delete this.test;
      }, ReferenceError);
    });
    it('should set the setActive method to a bound method', function () {
      const test = new HeartBeat({});
      assert.ok(HeartBeat.prototype.setActive !== test.setActive);
    });
    it('should set the beat method to a bound method', function () {
      const test = new HeartBeat({});
      assert.ok(HeartBeat.prototype.beat !== test.beat);
    });
    it('should call the setInactive method', function () {
      const spy = sinon.spy(HeartBeat.prototype, 'setInactive');
      this.test = new HeartBeat({});
      assert.ok(spy.calledTwice);
      spy.restore();
    });
    it('should call the start method', function () {
      const spy = sinon.spy(HeartBeat.prototype, 'start');
      this.test = new HeartBeat({});
      assert.ok(spy.calledOnce);
      spy.restore();
    });
  });
  describe('beat method', function () {
    beforeEach(function () {
      this.heartBeat = new HeartBeat({});
      this.heartBeat.active = false;
    });
    it('should call setInactive', function () {
      const spy = sinon.spy(this.heartBeat, 'setInactive');
      this.heartBeat.beat();
      assert.ok(spy.calledOnce);
    });
    it('should set timerId to a setTimeout identifier', function () {
      this.heartBeat.beat();
      assert.equal(typeof this.heartBeat.timerId, 'number');
    });
    it('should return a setTimeout identifier', function () {
      assert.equal(typeof this.heartBeat.beat(), 'number');
    });
    describe('and activity is detected', function () {
      beforeEach(function () {
        this.heartBeat.active = true;
        this.fetchspy = sinon.stub();
        this.fetchspy.returns(Promise.resolve({}));
        this.modelMock = {
          fetch: this.fetchspy,
        };
        this.kolibri = {
          resources: {
            SessionResource: {
              getModel: () => this.modelMock,
            },
          },
        };
        this.heartBeat.kolibri = this.kolibri;
      });
      it('should call fetch on the session model', function () {
        this.heartBeat.beat();
        assert.ok(this.fetchspy.calledOnce);
      });
      it('should call setActivityListeners', function () {
        const spy = sinon.spy(this.heartBeat, 'setActivityListeners');
        this.heartBeat.beat();
        assert.ok(spy.calledOnce);
      });
    });
  });
});
