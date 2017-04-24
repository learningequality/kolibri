/* eslint-env mocha */
const Vue = require('vue-test');
const sinon = require('sinon');
const audioRenderer = require('../../src/views/index.vue');

function makeVm(propsData) {
  const Ctor = Vue.extend(audioRenderer);
  return new Ctor({ propsData }).$mount();
}

describe('audio mp3 render component', () => {
  describe('timeUpdate', () => {
    it('does not error out if <audio> is undefined', () => {
      // regression test for https://github.com/learningequality/kolibri/issues/1276
      const vm = makeVm({ defaultFile: '' });
      const audioEl = vm.$el.querySelector('#audio');
      try {
        // unmount the vm to simulate original situation
        vm.$destroy();
        // then dispatch an event
        audioEl.dispatchEvent(new Event('timeupdate'));
      } catch (err) {
        sinon.assert.fail('No exceptions were expected');
      }
    });
  });
});
