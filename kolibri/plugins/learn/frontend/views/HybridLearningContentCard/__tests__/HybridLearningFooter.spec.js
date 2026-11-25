import { nextTick } from 'vue';
import { render, screen, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import VueRouter from 'vue-router';
import pluginData from 'kolibri-plugin-data';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import { createTranslator } from 'kolibri/utils/i18n';
import stubHttp from '../../__tests__/stubHttp';
import { PageNames } from '../../../constants';
import ResourceCard from '../../cards/ResourceCard.vue';
import HybridLearningFooter from '../HybridLearningFooter.vue';

jest.unmock('kolibri/client');
jest.unmock('kolibri/urls');

const http = jest.fn();
let httpStub;

const requestList = '/api/content/contentrequest/';

const { removeFromMyLibraryAction$ } = createTranslator(
  HybridLearningFooter.name,
  HybridLearningFooter.$trs,
);

function renderFooter(id, footerProps, listeners) {
  const contentNode = {
    id,
    title: 'Audio resource',
    is_leaf: true,
    learning_activities: [],
    files: [],
  };
  const router = new VueRouter({
    mode: 'abstract',
    routes: [{ path: '/resource', name: PageNames.TOPICS_CONTENT }, { path: '/library/:deviceId' }],
  });
  render(
    {
      render(h) {
        return h(ResourceCard, {
          props: { contentNode, to: { name: PageNames.TOPICS_CONTENT } },
          scopedSlots: {
            footer: () =>
              h(HybridLearningFooter, {
                props: { contentNode, ...footerProps },
                on: listeners,
              }),
          },
        });
      },
    },
    { routes: router, store: { getters: { currentFacilityId: () => 'facility' } } },
  );
  return { router };
}

describe('HybridLearningFooter', () => {
  beforeEach(() => {
    pluginData.urls = {
      prefix: '/',
      urls: {
        'kolibri:core:contentrequest_list': [['api/content/contentrequest/', []]],
        'kolibri:core:contentrequest_detail': [['api/content/contentrequest/%(pk)s/', ['pk']]],
      },
    };
    http.mockReset();
    http.mockImplementation((method, { pathname }, data) => {
      if (method === 'POST' && pathname === requestList) {
        const request = JSON.parse(data);
        return { ...request, id: `request-${request.contentnode_id}` };
      }
      if (method === 'DELETE' && pathname.startsWith(requestList)) {
        return null;
      }
      throw new Error(`Unexpected request: ${method} ${pathname}`);
    });
    httpStub = stubHttp(jest.spyOn, http);
  });

  afterEach(() => httpStub.mockRestore());

  describe.each(['click', 'Enter'])('footer activation by %s', activation => {
    async function activate(buttonName) {
      await nextTick();
      const button = screen.getByRole('button', { name: buttonName });
      const user = userEvent.setup();
      if (activation === 'click') {
        await user.click(button);
      } else {
        button.focus();
        await user.keyboard('{Enter}');
      }
    }

    it('requests bookmark removal and stays on the page', async () => {
      const removeFromBookmarks = jest.fn();
      const { router } = renderFooter(
        `bookmark-${activation}`,
        { bookmarked: true },
        { removeFromBookmarks },
      );
      const initialRoute = router.currentRoute;

      await activate(coreStrings.removeFromBookmarks$());

      expect(removeFromBookmarks).toHaveBeenCalledTimes(1);
      expect(router.currentRoute).toBe(initialRoute);
    });

    it('requests a download and stays on the page', async () => {
      const id = `download-${activation}`;
      const { router } = renderFooter(id, { allowDownloads: true });
      const initialRoute = router.currentRoute;

      await activate(coreStrings.downloadAction$());

      const downloadRequests = http.mock.calls
        .filter(([method, { pathname }]) => method === 'POST' && pathname === requestList)
        .map(([, , body]) => JSON.parse(body));
      expect(downloadRequests).toContainEqual(expect.objectContaining({ contentnode_id: id }));
      expect(await screen.findByRole('button', { name: coreStrings.moreOptions$() })).toBeVisible();
      expect(router.currentRoute).toBe(initialRoute);
    });

    it('opens the download menu and stays on the page', async () => {
      const { router } = renderFooter(`menu-${activation}`, { allowDownloads: true });
      const initialRoute = router.currentRoute;
      await nextTick();
      screen.getByRole('button', { name: coreStrings.downloadAction$() }).focus();
      await userEvent.setup().keyboard('{Enter}');

      const moreOptions = screen.getByRole('button', { name: coreStrings.moreOptions$() });
      const user = userEvent.setup();
      if (activation === 'click') {
        await user.click(moreOptions);
      } else {
        moreOptions.focus();
        await user.keyboard('{Enter}');
      }

      expect(screen.getByRole('menuitem', { name: removeFromMyLibraryAction$() })).toBeVisible();
      expect(router.currentRoute).toBe(initialRoute);
    });
  });

  describe('removing a download', () => {
    async function openMenu(id) {
      const { router } = renderFooter(id, { allowDownloads: true });
      const initialRoute = router.currentRoute;
      const user = userEvent.setup();
      await nextTick();
      screen.getByRole('button', { name: coreStrings.downloadAction$() }).focus();
      await user.keyboard('{Enter}');
      (await screen.findByRole('button', { name: coreStrings.moreOptions$() })).focus();
      await user.keyboard('{Enter}');
      const option = screen.getByRole('menuitem', { name: removeFromMyLibraryAction$() });
      return { user, router, initialRoute, option };
    }

    it('opens the confirmation by click and stays on the page', async () => {
      const { user, router, initialRoute, option } = await openMenu('confirm-click');

      await user.click(option);

      expect(screen.getByRole('dialog', { name: removeFromMyLibraryAction$() })).toBeVisible();
      expect(router.currentRoute).toBe(initialRoute);
    });

    it('opens the confirmation by Enter and stays on the page', async () => {
      const { user, router, initialRoute, option } = await openMenu('confirm-enter');

      option.focus();
      await user.keyboard('{Enter>}');
      const dialog = await screen.findByRole('dialog', { name: removeFromMyLibraryAction$() });
      await waitFor(() => expect(dialog).toContainElement(document.activeElement));
      await user.keyboard('{/Enter}');

      expect(dialog).toBeVisible();
      expect(router.currentRoute).toBe(initialRoute);
    });

    it('cancels removal and stays on the page', async () => {
      const { user, router, initialRoute, option } = await openMenu('cancel-remove');
      await user.click(option);
      const dialog = screen.getByRole('dialog', { name: removeFromMyLibraryAction$() });

      await user.click(within(dialog).getByRole('button', { name: coreStrings.cancelAction$() }));

      expect(dialog).not.toBeInTheDocument();
      expect(http.mock.calls.map(([method]) => method)).not.toContain('DELETE');
      expect(await screen.findByRole('button', { name: coreStrings.moreOptions$() })).toBeVisible();
      expect(router.currentRoute).toBe(initialRoute);
    });

    it.each(['click', 'Enter'])(
      'confirms removal by %s and stays on the page',
      async activation => {
        const id = `confirm-remove-${activation}`;
        const { user, router, initialRoute, option } = await openMenu(id);
        await user.click(option);
        const dialog = screen.getByRole('dialog', { name: removeFromMyLibraryAction$() });

        const remove = within(dialog).getByRole('button', { name: coreStrings.removeAction$() });
        if (activation === 'click') {
          await user.click(remove);
        } else {
          remove.focus();
          await user.keyboard('{Enter}');
        }

        expect(http).toHaveBeenCalledWith(
          'DELETE',
          expect.objectContaining({ pathname: `${requestList}request-${id}/` }),
          null,
        );
        await waitFor(() => expect(dialog).not.toBeInTheDocument());
        expect(screen.getByRole('button', { name: coreStrings.downloadAction$() })).toBeVisible();
        expect(router.currentRoute).toBe(initialRoute);
      },
    );
  });
});
