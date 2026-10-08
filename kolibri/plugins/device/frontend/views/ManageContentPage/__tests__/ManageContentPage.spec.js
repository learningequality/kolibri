import { nextTick } from 'vue';
import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import makeStore from '../../../__tests__/utils/makeStore';
import ManageContentPage, { pageTitleStrings } from '../index.vue';

jest.mock('kolibri/client');
jest.mock('kolibri/urls');
jest.mock('kolibri-plugin-data', () => ({
  __esModule: true,
  default: { deprecationWarnings: {} },
}));
jest.mock('kolibri/composables/useUser');
jest.mock('../../../composables/useContentTasks');

const { continueAction$, channelsLabel$ } = coreStrings;
const { documentTitle$ } = pageTitleStrings;

const FIRST_ADMIN_ID = 'first-admin-id';
const SECOND_ADMIN_ID = 'second-admin-id';

function renderComponent({ currentUserId }) {
  useUser.mockImplementation(() =>
    useUserMock({
      currentUserId,
      isUserLoggedIn: true,
      isLearner: false,
      isAdmin: true,
      isSuperuser: true,
      canManageContent: true,
    }),
  );
  return render(ManageContentPage, { store: makeStore(), routes: [] });
}

async function dismissWelcomeModal() {
  await userEvent.click(screen.getByRole('button', { name: continueAction$() }));
}

describe('ManageContentPage', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('titles the tab with the page title, with its visible header the only h1', async () => {
    document.title = '';
    window.localStorage.setItem(`DEVICE_WELCOME_MODAL_DISMISSED-${FIRST_ADMIN_ID}`, 'true');
    renderComponent({ currentUserId: FIRST_ADMIN_ID });
    await nextTick();
    expect(document.title).toBe(`${documentTitle$()} - Kolibri`);
    const headings = screen.queryAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(channelsLabel$());
  });

  it("stores the welcome modal dismissal under the current user's ID", async () => {
    renderComponent({ currentUserId: FIRST_ADMIN_ID });
    await dismissWelcomeModal();

    expect(window.localStorage.getItem(`DEVICE_WELCOME_MODAL_DISMISSED-${FIRST_ADMIN_ID}`)).toBe(
      'true',
    );
    expect(screen.queryByRole('button', { name: continueAction$() })).not.toBeInTheDocument();
  });

  it('still shows the welcome modal to another user after one user dismisses it', async () => {
    const { unmount } = renderComponent({ currentUserId: FIRST_ADMIN_ID });
    await dismissWelcomeModal();
    unmount();

    renderComponent({ currentUserId: SECOND_ADMIN_ID });
    expect(screen.getByRole('button', { name: continueAction$() })).toBeInTheDocument();
  });
});
