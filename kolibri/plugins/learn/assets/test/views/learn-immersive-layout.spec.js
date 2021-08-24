import { shallowMount, createLocalVue } from '@vue/test-utils';
import makeStore from '../makeStore';
import LearnImmersiveLayout from '../../src/views/LearnImmersiveLayout';

const localVue = createLocalVue();

const store = makeStore();
store.state.core = {
  blockDoubleClicks: true,
};

function makeWrapper({ propsData } = {}) {
  return shallowMount(LearnImmersiveLayout, {
    propsData,
    store,
    localVue,
    stubs: {
      LearningActivityBar: {
        name: 'LearningActivityBar',
        propsData: {
          resourceTitle: 'Test Title',
        },
        template: '<div></div>',
      },
      ContentPage: {
        name: 'ContentPage',
        template: '<div><slot></slot></div>',
      },
    },
  });
}

describe('LearnImmersiveLayout', () => {
  const wrapper = makeWrapper();
  it('smoke test', () => {
    expect(wrapper.exists()).toBe(true);
  });

  it('shows the Learning Activity Bar', () => {
    const wrapper = makeWrapper();
    expect(wrapper.find('[data-test="learningActivityBar"]').exists()).toBeTruthy();
  });

  it('shows the Content Page', () => {
    const wrapper = makeWrapper();
    expect(wrapper.find('[data-test="contentPage"]').exists()).toBeTruthy();
  });
});
