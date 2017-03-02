/* eslint-env mocha */
// The following two rules are disabled so that we can use anonymous functions with mocha
// This allows the test instance to be properly referenced with `this`
/* eslint prefer-arrow-callback: "off", func-names: "off" */

'use strict';

const Vue = require('vue-test');
const progressBar = require('../src/vue/progress-bar');
const ProgressBarComponent = Vue.extend(progressBar);
const assert = require('assert');

describe('progressBar Component', function () {
  describe('computed property', function () {
    describe('percent', function () {
      beforeEach(function () {
        this.vm = new ProgressBarComponent({
          propsData: {
            progress: 0,
          },
        }).$mount();
      });
      it('should give 0 percent for progress of < 0', function () {
        this.vm.progress = -1.0;
        assert.equal(this.vm.percent, 0);
      });
      it('should give 10 percent for progress of 0.1', function () {
        this.vm.progress = 0.1;
        assert.equal(this.vm.percent, 10);
      });
      it('should give 100 percent for progress of 1.0', function () {
        this.vm.progress = 1.0;
        assert.equal(this.vm.percent, 100);
      });
      it('should give 100 percent for progress of > 1.0', function () {
        this.vm.progress = 70.0;
        assert.equal(this.vm.percent, 100);
      });
    });
  });
});
