import { nextTick } from 'vue';
import { render, screen } from '@testing-library/vue';
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
const VISIBLE_HEADING = 'Lesson 1';

function renderPage(Shell, { title, options, content = '<p />' } = {}) {
  return render(
    {
      components: { Shell },
      setup() {
        if (title) {
          usePageTitle(title, options);
        }
      },
      template: `<Shell>${content}</Shell>`,
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
