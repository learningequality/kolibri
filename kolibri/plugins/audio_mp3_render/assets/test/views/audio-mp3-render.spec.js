/* eslint-env mocha */
const Vue = require('vue-test');
const sinon = require('sinon');
const simulant = require('simulant');
const audioRenderer = require('../../src/views/index.vue');

function makeVm(propsData) {
  const Ctor = Vue.extend(audioRenderer);
  return new Ctor({ propsData }).$mount();
}

describe('audio mp3 render component', () => {
  describe('timeUpdate', () => {
    it('does not error out if <audio> dispatches event after unmount', () => {
      // regression test for https://github.com/learningequality/kolibri/issues/1276
      const vm = makeVm({ defaultFile: '' });
      const audioEl = vm.$el.querySelector('#audio');
      const updateTimeSpy = sinon.spy(vm, 'updateTime');
      // unmount the vm to simulate original situation
      vm.$destroy();
      // then dispatch timeupdate event immediately after
      simulant.fire(audioEl, 'timeupdate');
      Vue.nextTick(() => {
        sinon.assert.called(updateTimeSpy);
      });
    });
  });
});
