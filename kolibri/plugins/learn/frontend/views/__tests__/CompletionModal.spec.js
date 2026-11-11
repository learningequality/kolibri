import { createLocalVue, mount } from '@vue/test-utils';
import VueRouter from 'vue-router';
import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { crossComponentTranslator } from 'kolibri/utils/i18n';
/* eslint-disable import-x/named */
import useContentLink, { useContentLinkMock } from '../../composables/useContentLink';
import useLearnerResources, {
  useLearnerResourcesMock,
} from '../../composables/useLearnerResources';
/* eslint-enable import-x/named */

import CompletionModal from '../CompletionModal';

jest.mock('../../composables/useContentLink');
jest.mock('../../composables/useDeviceSettings');
jest.mock('../../composables/useLearnerResources');
jest.mock('../../composables/useDevices');
jest.mock('kolibri/composables/useUser');
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow', () => ({
  __esModule: true,
  default: () => ({ windowBreakpoint: 2, windowHeight: 768, windowWidth: 1024 }),
}));
jest.mock('kolibri-common/apiResources/ContentNodeResource');

const STAY_BUTTON_LABEL = crossComponentTranslator(CompletionModal).$tr('stayButtonLabel');

const localVue = createLocalVue();
localVue.use(VueRouter);

function getCloseButton(wrapper) {
  return wrapper.findComponent({ ref: 'closeButton' });
}

function getStayHereButton(wrapper) {
  return wrapper.findComponent({ ref: 'staySection' }).findComponent({ ref: 'button' });
}

function getMoveOnButton(wrapper) {
  return wrapper.findComponent({ ref: 'nextContentNodeSection' }).findComponent({ ref: 'button' });
}

function makeWrapper({ propsData, data } = {}) {
  const router = new VueRouter();
  router.push('/');

  return mount(CompletionModal, {
    localVue,
    router,
    propsData: {
      contentNode: {
        id: 'test-content-node',
        ancestors: [],
        parent: 'test-parent',
      },
      isUserLoggedIn: false,
      ...propsData,
    },
    data,
  });
}

describe('CompletionModal', () => {
  it('smoke test', () => {
    const wrapper = makeWrapper();

    expect(wrapper.exists()).toBe(true);
  });

  it('focuses its first section button once its content loads', async () => {
    render(CompletionModal, {
      routes: [],
      props: {
        contentNode: { id: 'test-content-node', ancestors: [], parent: 'test-parent' },
        isUserLoggedIn: true,
      },
    });
    const stayButton = await screen.findByRole('button', {
      name: STAY_BUTTON_LABEL,
    });
    await waitFor(() => expect(stayButton).toHaveFocus());
  });

  it('focuses the dialog while its content loads', async () => {
    useLearnerResources.mockImplementationOnce(() =>
      useLearnerResourcesMock({ fetchLesson: jest.fn(() => new Promise(() => {})) }),
    );
    render(CompletionModal, {
      routes: [],
      props: {
        contentNode: { id: 'test-content-node', ancestors: [], parent: 'test-parent' },
        isUserLoggedIn: true,
        lessonId: 'lesson-id',
      },
    });
    const dialog = screen.getByRole('dialog');
    await waitFor(() => expect(dialog).toHaveFocus());
  });

  describe('on Enter', () => {
    const NEXT_ROUTE = '/next';

    async function renderWithNextResource(lessonResources) {
      useLearnerResources.mockImplementation(() =>
        useLearnerResourcesMock({
          fetchLesson: jest.fn().mockResolvedValue({ resources: lessonResources }),
        }),
      );
      useContentLink.mockImplementation(() =>
        useContentLinkMock({ genContentLinkKeepCurrentBackLink: jest.fn(() => NEXT_ROUTE) }),
      );
      const router = new VueRouter({ mode: 'abstract', routes: [{ path: NEXT_ROUTE }] });
      render(CompletionModal, {
        routes: router,
        props: {
          contentNode: { id: 'test-content-node', ancestors: [], parent: 'test-parent' },
          isUserLoggedIn: true,
          lessonId: 'lesson-id',
        },
      });
      await screen.findByRole('button', {
        name: STAY_BUTTON_LABEL,
      });
      return router;
    }

    const LESSON_WITH_NEXT = [
      { contentnode_id: 'test-content-node' },
      { contentnode_id: 'next-node', contentnode: { id: 'next-node', title: 'Next resource' } },
    ];

    async function pressEnter(element) {
      await fireEvent.keyDown(element, { key: 'Enter' });
      await fireEvent.keyUp(element, { key: 'Enter' });
    }

    afterEach(() => {
      useLearnerResources.mockImplementation(() => useLearnerResourcesMock());
      useContentLink.mockImplementation(() => useContentLinkMock());
    });

    it('moves on to the next resource', async () => {
      const router = await renderWithNextResource(LESSON_WITH_NEXT);
      await pressEnter(screen.getByRole('dialog'));
      expect(router.currentRoute.path).toBe(NEXT_ROUTE);
    });

    it('ignores the keyup of an Enter pressed before it opened', async () => {
      const router = await renderWithNextResource(LESSON_WITH_NEXT);
      await fireEvent.keyUp(screen.getByRole('dialog'), { key: 'Enter' });
      expect(router.currentRoute.path).not.toBe(NEXT_ROUTE);
    });

    it('stays put on the last resource', async () => {
      const router = await renderWithNextResource([{ contentnode_id: 'test-content-node' }]);
      await pressEnter(screen.getByRole('dialog'));
      expect(router.currentRoute.path).not.toBe(NEXT_ROUTE);
    });
  });

  it('displays close button', () => {
    const wrapper = makeWrapper();

    expect(getCloseButton(wrapper).exists()).toBe(true);
  });

  it('emits `close` event on close button click', () => {
    const wrapper = makeWrapper();
    getCloseButton(wrapper).trigger('click');

    expect(wrapper.emitted().close).toBeTruthy();
    expect(wrapper.emitted().close.length).toBe(1);
  });

  describe('when a user is not logged in', () => {
    let wrapper;

    beforeEach(() => {
      wrapper = makeWrapper({
        propsData: {
          isUserLoggedIn: false,
        },
      });
    });

    it('displays a warning message', () => {
      expect(wrapper.text()).toContain('Sign in or create an account to begin earning points');
    });

    it("doesn't display obtained points", () => {
      expect(wrapper.text()).not.toContain('+ 500 points');
    });
  });

  describe('when a user is logged in', () => {
    let wrapper;

    beforeEach(() => {
      wrapper = makeWrapper({
        propsData: {
          isUserLoggedIn: true,
        },
      });
    });

    it("doesn't display a warning message", () => {
      expect(wrapper.text()).not.toContain('Sign in or create an account to begin earning points');
    });

    it('displays obtained points', () => {
      expect(wrapper.text()).toContain('+ 500 points');
    });

    it('does not display obtained points if wasComplete is true', () => {
      wrapper = makeWrapper({
        propsData: {
          isUserLoggedIn: true,
          wasComplete: true,
        },
      });
      expect(wrapper.text()).not.toContain('+ 500 points');
    });

    it("displays 'Stay and practice' section with 'Stay here' button", async () => {
      const wrapper = makeWrapper();
      await wrapper.setProps({ isUserLoggedIn: true });
      await wrapper.vm.$nextTick();

      expect(wrapper.text()).toContain('Stay and practice');
      expect(getStayHereButton(wrapper).exists()).toBe(true);
    });

    it("emits `close` even on 'Stay here' button click", async () => {
      const wrapper = makeWrapper();
      await wrapper.setProps({ isUserLoggedIn: true });
      await wrapper.vm.$nextTick();
      getStayHereButton(wrapper).trigger('click');

      expect(wrapper.emitted().close).toBeTruthy();
      expect(wrapper.emitted().close.length).toBe(1);
    });
  });

  describe("when a resource doesn't have a next resource", () => {
    let wrapper;

    beforeEach(() => {
      wrapper = makeWrapper();
    });

    it("doesn't display 'Keep going' section", () => {
      expect(wrapper.text()).not.toContain('Keep going');
    });
  });

  describe('when a resource has a next resource', () => {
    let wrapper;

    beforeEach(() => {
      wrapper = makeWrapper({
        data() {
          return { nextContentNode: { title: 'Next content node', id: 'testetesttestst' } };
        },
      });
    });

    it("displays 'Keep going section' with the next resource information and 'Move on' button", () => {
      expect(wrapper.text()).toContain('Keep going');
      expect(wrapper.text()).toContain('Next content node');
      expect(getMoveOnButton(wrapper).exists()).toBe(true);
    });
  });

  describe("when a resource doesn't have any recommended resources", () => {
    let wrapper;

    beforeEach(() => {
      wrapper = makeWrapper({
        propsData: {
          recommendedContentNodes: undefined,
        },
      });
    });

    it("doesn't display 'You may find helpful' section", () => {
      expect(wrapper.text()).not.toContain('You may find helpful');
    });
  });

  describe('when a resource has some recommended resources', () => {
    let wrapper;

    beforeEach(() => {
      wrapper = makeWrapper({
        data() {
          return {
            recommendedContentNodes: [
              { id: 'recommended-resource-1', title: 'The first recommended resource' },
              { id: 'recommended-resource-2', title: 'The second recommended resource ' },
            ],
          };
        },
      });
    });

    it("displays 'You may find helpful' section", () => {
      expect(wrapper.text()).toContain('You may find helpful');
    });

    it('displays all recommended resources as links', () => {
      const recommendedResources = wrapper.findAll("[data-testid='recommended-resource']");

      expect(recommendedResources.length).toBe(2);
      expect(recommendedResources.at(0).text()).toContain('The first recommended resource');
      expect(recommendedResources.at(0).element.tagName).toBe('A');
      expect(recommendedResources.at(1).text()).toContain('The second recommended resource');
      expect(recommendedResources.at(1).element.tagName).toBe('A');
    });
  });
});
