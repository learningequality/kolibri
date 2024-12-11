import { createLocalVue, mount, shallowMount } from '@vue/test-utils';
import Vuex, { Store } from 'vuex';
import VueRouter from 'vue-router';
import ExploreLibrariesPage from '../../src/views/ExploreLibrariesPage';
import usePinnedDevices from '../../src/composables/usePinnedDevices';

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.use(VueRouter);

jest.mock('../../src/composables/useCardLayoutSpan');
jest.mock('kolibri-common/composables/useChannels');
jest.mock('../../src/composables/useDevices');
jest.mock('../../src/composables/useContentLink');
jest.mock('../../src/composables/usePinnedDevices');

function makeWrapper({ getters, options, fullMount = false } = {}) {
  const store = new Store({
    state: { core: { loading: false } },
    getters: {
      isSuperuser: jest.fn(),
      ...getters,
    },
  });
  if (fullMount) {
    return mount(ExploreLibrariesPage, { store, localVue, ...options });
  } else {
    return shallowMount(ExploreLibrariesPage, { store, localVue, ...options });
  }
}

describe('ExploreLibrariesPage', () => {
  let wrapper;

  const translations = {
    allLibraries: 'All Libraries',
    showingLibraries: 'Showing',
  };
  const options = {
    computed: {
      areMoreDevicesAvailable: jest.fn(() => true),
      displayShowMoreButton: jest.fn(() => true),
      pageHeaderStyle: jest.fn(),
    },
    $trs: translations,
  };
  beforeEach(() => {
    usePinnedDevices.mockImplementation(() => ({
      pinnedDevicesExist: false,
      displayShowButton: true,
      fetchPinsForUser: jest.fn(() => Promise.resolve([])),
      unpinnedDevices: [],
      pinnedDevices: [],
    }));
    wrapper = makeWrapper({
      options,
    });
  });

  it('renders without errors', () => {
    expect(wrapper.exists()).toBe(true);
  });

  it('renders the page header correctly', () => {
    const pageHeader = wrapper.find('[data-test="page-header"]');
    expect(pageHeader.exists()).toBe(true);
    expect(pageHeader.text()).toContain(translations.allLibraries);
    expect(pageHeader.text()).toContain(translations.showingLibraries);
  });

  it('show more libraries section if pinned devices exist', () => {
    usePinnedDevices.mockImplementation(() => ({
      pinnedDevicesExist: true,
      displayShowButton: true,
      fetchPinsForUser: jest.fn(() => Promise.resolve([])),
      unpinnedDevices: [],
      pinnedDevices: [],
    }));
    wrapper = makeWrapper({
      options,
    });
    const moreLibraries = wrapper.find('[data-test="more-libraries"]');
    expect(moreLibraries.element).toBeTruthy();
    expect(moreLibraries.text()).toContain('More');
    const showButton = wrapper.find('[data-test="show-button"]');
    expect(showButton.element).toBeTruthy();
  });

  it('loads more devices when show more button is clicked', async () => {
    const showMoreButton = wrapper.find('[data-test="show-more-button"]');
    showMoreButton.trigger('click');
    await wrapper.vm.$nextTick();
    const libraryItems = wrapper.findAllComponents({ name: 'LibraryItem' });
    expect(libraryItems.length).toEqual(0);
  });

  // Add more tests as needed for other functionality in the component
});
