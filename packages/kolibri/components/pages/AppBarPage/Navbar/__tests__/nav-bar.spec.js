import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
import { shallowMount } from '@vue/test-utils';
import Navbar from '../index';

jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow');

function makeWrapper({ propsData } = {}) {
  return shallowMount(Navbar, { propsData });
}

const longerNavigationList = [
  {
    title: 'Title',
    link: 'url',
    icon: 'dashboard',
    color: 'white',
  },
  {
    title: 'Title 2',
    link: 'url',
    icon: 'dashboard',
    color: 'white',
  },
  {
    title: 'Title 3',
    link: 'url',
    icon: 'dashboard',
    color: 'white',
  },
  {
    title: 'Title 4',
    link: 'url',
    icon: 'dashboard',
    color: 'white',
  },
  {
    title: 'Title 5',
    link: 'url',
    icon: 'dashboard',
    color: 'white',
  },
];

describe('Navbar', () => {
  beforeAll(() => {
    useKResponsiveWindow.mockImplementation(() => ({
      windowWidth: 0,
    }));
  });
  it('smoke test', () => {
    const wrapper = makeWrapper();
    expect(wrapper.exists()).toBe(true);
  });
  describe('the overflow menu', () => {
    describe('overflow not needed', () => {
      it('does not display a KIconButton with a dropdown menu', () => {
        const wrapper = makeWrapper(Navbar, {
          propsData: {
            navigationLinks: longerNavigationList,
          },
        });
        expect(wrapper.findComponent({ name: 'KIconButton' }).element).toBeFalsy();
      });
    });
  });
});
