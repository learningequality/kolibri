import { nextTick, ref } from 'vue';
import { render, screen, waitFor } from '@testing-library/vue';
import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
import usePageTitle from 'kolibri/composables/usePageTitle';
import { error } from 'kolibri/utils/appError';
import AppBarPage from '../AppBarPage';
import ImmersivePage from '../ImmersivePage';
import NotificationsRoot from '../NotificationsRoot';

jest.mock('kolibri/composables/useUser');
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow');
jest.mock('vue-router/composables', () => ({
  useRoute: jest.fn(() => ({ params: {}, query: {} })),
}));
jest.mock('../NotificationsRoot/internal/PingbackNotificationResource');
jest.mock('../NotificationsRoot/internal/PingbackNotificationDismissedResource');

const TITLE = ['Lesson 1', 'Class A'];
const VISIBLE_HEADING = 'All passwords';

function renderPage(Shell, { title, options, content = '<p />', loading = false } = {}) {
  return render(
    {
      components: { Shell },
      setup() {
        if (title) {
          usePageTitle(title, options);
        }
        return { loading };
      },
      template: `<Shell :loading="loading">${content}</Shell>`,
    },
    { routes: [] },
  );
}

function pageHeadings() {
  return screen.queryAllByRole('heading', { level: 1 });
}

describe('page heading', () => {
  beforeEach(() => {
    error.value = null;
    useKResponsiveWindow.mockImplementation(() => ({ windowIsSmall: false }));
  });

  describe.each([
    ['AppBarPage', AppBarPage],
    ['ImmersivePage', ImmersivePage],
  ])('%s', (_, Shell) => {
    it('renders the registered title as a visually hidden heading', async () => {
      renderPage(Shell, { title: TITLE });
      await nextTick();
      const headings = pageHeadings();
      expect(headings).toHaveLength(1);
      expect(headings[0]).toHaveTextContent(TITLE.join(' - '));
      expect(headings[0]).toHaveClass('visuallyhidden');
    });

    it("leaves the page's own visible heading as the only one", async () => {
      renderPage(Shell, {
        title: TITLE,
        options: { hasVisibleHeading: true },
        content: `<h1>${VISIBLE_HEADING}</h1>`,
      });
      await nextTick();
      const headings = pageHeadings();
      expect(headings).toHaveLength(1);
      expect(headings[0]).toHaveTextContent(VISIBLE_HEADING);
      expect(headings[0]).not.toHaveClass('visuallyhidden');
    });

    it("keeps the hidden heading beside an unflagged page's own heading", async () => {
      renderPage(Shell, { title: TITLE, content: `<h1>${VISIBLE_HEADING}</h1>` });
      await nextTick();
      const headings = pageHeadings();
      expect(headings).toHaveLength(2);
      expect(headings.filter(heading => heading.classList.contains('visuallyhidden'))).toHaveLength(
        1,
      );
    });

    describe('when the page renders its own heading only after loading', () => {
      function renderLoadingPage() {
        const loading = ref(true);
        render(
          {
            components: { Shell },
            setup() {
              usePageTitle(TITLE, { hasVisibleHeading: true });
              return { loading };
            },
            template: `<Shell>
              <div><h1 v-if="!loading">${VISIBLE_HEADING}</h1></div>
            </Shell>`,
          },
          { routes: [] },
        );
        return loading;
      }

      it('renders the registered title as a hidden heading while loading', async () => {
        renderLoadingPage();
        await nextTick();
        const headings = pageHeadings();
        expect(headings).toHaveLength(1);
        expect(headings[0]).toHaveTextContent(TITLE.join(' - '));
        expect(headings[0]).toHaveClass('visuallyhidden');
      });

      it("leaves the page's heading as the only one once it renders", async () => {
        const loading = renderLoadingPage();
        await nextTick();
        loading.value = false;
        await waitFor(() => expect(pageHeadings()[0]).not.toHaveClass('visuallyhidden'));
        expect(pageHeadings()).toHaveLength(1);
        expect(pageHeadings()[0]).toHaveTextContent(VISIBLE_HEADING);
      });

      it('renders the hidden heading again when the page heading goes away', async () => {
        const loading = renderLoadingPage();
        await nextTick();
        loading.value = false;
        await waitFor(() => expect(pageHeadings()[0]).not.toHaveClass('visuallyhidden'));
        loading.value = true;
        await waitFor(() => expect(pageHeadings()[0]).toHaveClass('visuallyhidden'));
        expect(pageHeadings()).toHaveLength(1);
      });
    });

    describe('when one page replaces another inside the same shell', () => {
      function headedPage(name, withHeading) {
        return {
          name,
          setup() {
            usePageTitle(name, { hasVisibleHeading: true });
          },
          template: withHeading ? `<h1>${VISIBLE_HEADING}</h1>` : '<p />',
        };
      }

      function renderSwap(First, Second) {
        const showFirst = ref(true);
        render(
          {
            components: { Shell, First, Second },
            setup() {
              return { showFirst };
            },
            template: '<Shell><First v-if="showFirst" /><Second v-else /></Shell>',
          },
          { routes: [] },
        );
        return () => {
          showFirst.value = false;
        };
      }

      it("leaves the new page's heading as the only one", async () => {
        const swap = renderSwap(headedPage('FirstPage', false), headedPage('SecondPage', true));
        await waitFor(() => expect(pageHeadings()[0]).toHaveClass('visuallyhidden'));
        swap();
        await waitFor(() => expect(pageHeadings()[0]).toHaveTextContent(VISIBLE_HEADING));
        expect(pageHeadings()).toHaveLength(1);
      });

      it('renders the hidden heading when the new page has none', async () => {
        const secondTitle = 'SecondPage';
        const swap = renderSwap(headedPage('FirstPage', true), headedPage(secondTitle, false));
        await waitFor(() => expect(pageHeadings()[0]).not.toHaveClass('visuallyhidden'));
        swap();
        await waitFor(() => expect(pageHeadings()[0]).toHaveTextContent(secondTitle));
        expect(pageHeadings()).toHaveLength(1);
        expect(pageHeadings()[0]).toHaveClass('visuallyhidden');
      });
    });

    it("renders only the page's heading while the shell loads", async () => {
      renderPage(Shell, {
        title: TITLE,
        options: { hasVisibleHeading: true },
        content: `<h1>${VISIBLE_HEADING}</h1>`,
        loading: true,
      });
      await nextTick();
      await nextTick();
      const headings = pageHeadings();
      expect(headings).toHaveLength(1);
      expect(headings[0]).toHaveTextContent(VISIBLE_HEADING);
    });

    it('renders no heading when nothing is registered', async () => {
      renderPage(Shell);
      await nextTick();
      expect(pageHeadings()).toHaveLength(0);
    });
  });

  describe('when NotificationsRoot shows its own page', () => {
    function renderInNotificationsRoot({ authorized = true } = {}) {
      return render(
        {
          components: { NotificationsRoot, AppBarPage },
          setup() {
            usePageTitle(TITLE);
            return { authorized };
          },
          template: `<NotificationsRoot :authorized="authorized" authorizedRole="admin">
            <AppBarPage><p /></AppBarPage>
          </NotificationsRoot>`,
        },
        { routes: [] },
      );
    }

    it("leaves the error page's heading as the only one while an error is set", async () => {
      renderInNotificationsRoot();
      error.value = 'boom';
      await nextTick();
      const headings = pageHeadings();
      expect(headings).toHaveLength(1);
      expect(headings[0]).not.toHaveClass('visuallyhidden');
    });

    it("leaves the not-authorized page's heading as the only one", async () => {
      renderInNotificationsRoot({ authorized: false });
      await nextTick();
      const headings = pageHeadings();
      expect(headings).toHaveLength(1);
      expect(headings[0]).not.toHaveClass('visuallyhidden');
    });
  });
});
