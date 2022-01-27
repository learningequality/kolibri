import { shallowMount } from '@vue/test-utils';
import LibraryAndChannelBrowserMainContent from '../../src/views/LibraryAndChannelBrowserMainContent';

describe('Library and Channel Browser Main Content', () => {
  const wrapper = shallowMount(LibraryAndChannelBrowserMainContent, {
    computed: { windowIsLarge: () => true, backRoute: 'test' },
    propsData: { contents: [{ node: 1 }], currentCardViewStyle: 'card' },
  });

  it('smoke test', () => {
    expect(wrapper.exists()).toBe(true);
  });
  describe('When the user has a medium or large screen', () => {
    describe('When `currentCardViewStyle` is a card', () => {
      const wrapper = shallowMount(LibraryAndChannelBrowserMainContent, {
        computed: { windowIsSmall: () => false, backRoute: 'test' },
        propsData: { contents: [{ node: 1 }], currentCardViewStyle: 'card' },
      });
      it('displays a `CardGrid`, and within the grid, a `HybridLearningContentCard` for each content node', () => {
        expect(wrapper.find('[data-test="non-mobile-card-grid"]').element).toBeTruthy();
        expect(wrapper.find('[data-test="content-card"]').element).toBeTruthy();
      });
      it('does not display a `CardGrid` with a `ResourceCard` for each content node in a single, full-width column', () => {
        expect(wrapper.find('[data-test="mobile-card-grid"]').element).toBeFalsy();
        expect(wrapper.find('[data-test="resource-card"]').element).toBeFalsy();
      });
      it('does not display a `HybridLearningContentCardListView` for each content node', () => {
        expect(wrapper.find('[data-test="card-list-view"]').element).toBeFalsy();
      });
    });
    describe('When `currentCardViewStyle` is a list', () => {
      const wrapper = shallowMount(LibraryAndChannelBrowserMainContent, {
        computed: { windowIsSmall: () => false, backRoute: 'test' },
        propsData: { contents: [{ node: 1 }], currentCardViewStyle: 'list' },
      });
      it('displays a `HybridLearningContentCardListView` for each content node, in a single, full-width column', () => {
        expect(wrapper.find('[data-test="card-list-view"]').element).toBeTruthy();
      });
      it('does not display a `CardGrid` with a `ResourceCard` for each content node in a single, full-width column', () => {
        expect(wrapper.find('[data-test="mobile-card-grid"]').element).toBeFalsy();
        expect(wrapper.find('[data-test="resource-card"]').element).toBeFalsy();
      });
      it('does not display a `CardGrid` with `HybridLearningContentCard`s in columns', () => {
        expect(wrapper.find('[data-test="non-mobile-card-grid"]').element).toBeFalsy();
        expect(wrapper.find('[data-test="content-card"]').element).toBeFalsy();
      });
    });
  });
  describe('When the user is on a mobile device', () => {
    const wrapper = shallowMount(LibraryAndChannelBrowserMainContent, {
      computed: { windowIsSmall: () => true, backRoute: 'test' },
      propsData: { contents: [{ node: 1 }] },
    });
    it('displays a `CardGrid` with a `ResourceCard` for each content node in a single, full-width column', () => {
      expect(wrapper.find('[data-test="mobile-card-grid"]').element).toBeTruthy();
      expect(wrapper.find('[data-test="resource-card"]').element).toBeTruthy();
    });
    it('does not display a `CardGrid` with `HybridLearningContentCard`s in columns', () => {
      expect(wrapper.find('[data-test="non-mobile-card-grid"]').element).toBeFalsy();
      expect(wrapper.find('[data-test="content-card"]').element).toBeFalsy();
    });
    it('does not display a `HybridLearningContentCardListView` for each content node', () => {
      expect(wrapper.find('[data-test="card-list-view"]').element).toBeFalsy();
    });
  });
});
