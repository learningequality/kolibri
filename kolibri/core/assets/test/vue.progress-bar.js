/* eslint-env mocha */
const Vue = require('vue-test');
const assert = require('assert');
const progressBar = require('../src/views/progress-bar');

const ProgressBarComponent = Vue.extend(progressBar);

describe('progressBar Component', () => {
  describe('`percent` computed property', () => {
    let vm;
    beforeEach(() => {
      vm = new ProgressBarComponent({
        propsData: {
          progress: 0,
        },
      }).$mount();
    });
    it('should give 0 percent for progress of < 0', () => {
      vm.progress = -0.0000000001;
      assert.equal(vm.percent, 0);
    });
    it('should give 10 percent for progress of 0.1', () => {
      vm.progress = 0.1;
      assert.equal(vm.percent, 10);
    });
    it('should give 100 percent for progress of 1.0', () => {
      vm.progress = 1.0;
      assert.equal(vm.percent, 100);
    });
    it('should give 100 percent for progress of > 1.0', () => {
      vm.progress = 1.0000000001;
      assert.equal(vm.percent, 100);
    });
  });
});
