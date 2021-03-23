import { mount } from '@vue/test-utils';
import VueRouter from 'vue-router';
import LessonResourceSelectionPage from '../index.vue';
import makeStore from '../../../../../test/makeStore';

const router = new VueRouter({
  routes: [],
})

router.getRoute = name => ({ name });

function makeWrapper() {
  const wrapper = mount(LessonResourceSelectionPage, {
    store: makeStore(),
    router,
  });
  return { wrapper };
}

describe('LessonResourceSelectionPage', () => {
  it('mounts', () => {
    const { wrapper } = makeWrapper();
  });
});
