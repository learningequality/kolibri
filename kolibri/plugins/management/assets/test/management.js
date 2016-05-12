/* eslint-env mocha */
import Vue from 'vue';
import Management from 'vue!../src/main.vue';
import assert from 'assert';

describe('The management module', () => {
  it('defines a Management vue', () => {
    // A sanity check
    assert(Management !== undefined);
  });

  describe('has the following components:', () => {
    const vm = new Vue({
      components: { Management },
    }).$mount();

    it('a classroom selector', () => {
      Vue.nextTick(() => {
        const el = vm.$el.querySelector('.classroom-selector');
        assert.notStrictEqual(el, null);
      });
    });

    it('a learner group selector', () => {
      Vue.nextTick(() => {
        const el = vm.$el.querySelector('.learner-group-selector');
        assert.notStrictEqual(el, null);
      });
    });

    it('a learner roster', () => {
      Vue.nextTick(() => {
        const el = vm.$el.querySelector('.learner-roster');
        assert.notStrictEqual(el, null);
      });
    });
  });
});
