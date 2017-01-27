/* eslint-env mocha */
// The following two rules are disabled so that we can use anonymous functions with mocha
// This allows the test instance to be properly referenced with `this`
/* eslint prefer-arrow-callback: "off", func-names: "off" */

'use strict';

const Vue = require('vue-test');
const progressIcon = require('../src/vue/progress-icon');
const ProgressIconComponent = Vue.extend(progressIcon);
const assert = require('assert');

describe('progressIcon Component', function () {
  describe('computed property', function () {
    describe('isInProgress', function () {
      beforeEach(function () {
        this.vm = new ProgressIconComponent().$mount();
      });
      it('should be false for progress of < 0', function () {
        this.vm.progress = -1.0;
        assert.equal(this.vm.isInProgress, false);
      });
      it('should be true for progress of 0.1', function () {
        this.vm.progress = 0.1;
        assert.equal(this.vm.isInProgress, true);
      });
      it('should be false for progress of 1.0', function () {
        this.vm.progress = 1.0;
        assert.equal(this.vm.isInProgress, false);
      });
      it('should be false for progress of > 1.0', function () {
        this.vm.progress = 2.0;
        assert.equal(this.vm.isInProgress, false);
      });
    });
    describe('isCompleted', function () {
      beforeEach(function () {
        this.vm = new ProgressIconComponent().$mount();
      });
      it('should be false for progress of < 0', function () {
        this.vm.progress = -1.0;
        assert.equal(this.vm.isCompleted, false);
      });
      it('should be false for progress of 0.1', function () {
        this.vm.progress = 0.1;
        assert.equal(this.vm.isCompleted, false);
      });
      it('should be true for progress of 1.0', function () {
        this.vm.progress = 1.0;
        assert.equal(this.vm.isCompleted, true);
      });
      it('should be true for progress of > 1.0', function () {
        this.vm.progress = 2.0;
        assert.equal(this.vm.isCompleted, true);
      });
    });
  });
});
