import { shallowMount } from '@vue/test-utils';
import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
import LibraryAndChannelBrowserMainContent from '../../src/views/LibraryAndChannelBrowserMainContent';

jest.mock('../../src/composables/useContentLink');
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow');

describe('Library and Channel Browser Main Content', () => {
  let wrapper;
  beforeEach(() => {
    useKResponsiveWindow.mockImplementation(() => ({
      windowIsSmall: false,
    }));
    wrapper = shallowMount(LibraryAndChannelBrowserMainContent, {
      computed: { backRoute: 'test' },
      propsData: {
        contents: [{ node: 1 }, { node: 2 }, { node: 3 }],
        currentCardViewStyle: 'card',
      },
    });
  });

  it('smoke test', () => {
    expect(wrapper.exists()).toBe(true);
  });
  describe('When the user has a medium or large screen', () => {
    describe('When `currentCardViewStyle` is a card', () => {
      it('displays a `CardGrid`, and within the grid, a `HybridLearningContentCard` for each content node', () => {
        expect(wrapper.find('[data-test="non-mobile-card-grid"]').element).toBeTruthy();
        it.each([{ node: 1 }, { node: 2 }, { node: 3 }], 'displays a card for each node n', n => {
          expect(wrapper.find(`[data-test="HybridLearningContentCard-"${n}]`).element).toBeTruthy();
        });
      });
      it('does not display a `CardGrid` with a `ResourceCard` for each content node in a single, full-width column', () => {
        expect(wrapper.find('[data-test="mobile-card-grid"]').element).toBeFalsy();
        expect(wrapper.find('[data-test="ResourceCard"]').element).toBeFalsy();
      });
      it('does not display a `CardList` for each content node', () => {
        expect(wrapper.find('[data-test="CardList"]').element).toBeFalsy();
      });
    });
    describe('When `currentCardViewStyle` is a list', () => {
      beforeEach(() => {
        wrapper = shallowMount(LibraryAndChannelBrowserMainContent, {
          computed: { backRoute: 'test' },
          propsData: { contents: [{ node: 1 }], currentCardViewStyle: 'list' },
        });
      });
      it('displays a `CardList` for each content node, in a single, full-width column', () => {
        it.each([{ node: 1 }, { node: 2 }, { node: 3 }], 'displays a card for each node n', n => {
          expect(wrapper.find(`[data-test="CardList-"${n}]`).element).toBeTruthy();
        });
      });
      it('does not display a `CardGrid` with a `ResourceCard` for each content node in a single, full-width column', () => {
        expect(wrapper.find('[data-test="mobile-card-grid"]').element).toBeFalsy();
        expect(wrapper.find('[data-test="ResourceCard"]').element).toBeFalsy();
      });
      it('does not display a `CardGrid` with `HybridLearningContentCard`s in columns', () => {
        expect(wrapper.find('CardGrid').element).toBeFalsy();
        expect(wrapper.find('[data-test="HybridLearningContentCard"]').element).toBeFalsy();
      });
    });
  });
  describe('When the user is on a mobile device', () => {
    beforeEach(() => {
      useKResponsiveWindow.mockImplementation(() => ({
        windowIsSmall: true,
      }));
      wrapper = shallowMount(LibraryAndChannelBrowserMainContent, {
        computed: { backRoute: 'test' },
        propsData: { contents: [{ node: 1 }] },
      });
    });
    it('displays a `CardGrid` with a `ResourceCard` for each content node in a single, full-width column', () => {
      expect(wrapper.find('[data-test="mobile-card-grid"]').element).toBeTruthy();
      it.each(
        [{ node: 1 }, { node: 2 }, { node: 3 }],
        'displays a `ResourceCard` for each node n',
        n => {
          expect(wrapper.find(`[data-test="ResourceCard-"${n}]`).element).toBeTruthy();
        },
      );
    });
    it('does not display a `CardGrid` with `HybridLearningContentCard`s in columns', () => {
      expect(wrapper.find('[data-test="non-mobile-card-grid"]').element).toBeFalsy();
      expect(wrapper.find('[data-test="HybridLearningContentCard"]').element).toBeFalsy();
    });
    it('does not display a `CardList` for each content node', () => {
      expect(wrapper.find('[data-test="CardList"]').element).toBeFalsy();
    });
  });
});
