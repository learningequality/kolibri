import { render, screen, fireEvent, waitFor } from '@testing-library/vue';
import '@testing-library/jest-dom';
import { ref } from 'vue';
import VueRouter from 'vue-router';
import useFacility, { useFacilityMock } from 'kolibri-common/composables/useFacility'; // eslint-disable-line
import { picturePasswordStrings } from 'kolibri-common/strings/picturePasswords';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import makeStore from '../../../__tests__/utils/makeStore';
import ClassEditPage, { pageTitleStrings } from '../index.vue';
import { PageNames } from '../../../constants';

jest.mock('kolibri-common/composables/useFacility');

const { printPicturePasswordsAction$ } = picturePasswordStrings;
const { optionsLabel$ } = coreStrings;

const classId = 'test-class-id';
const CLASS_NAME = 'Test Class';

function createRouter() {
  return new VueRouter({
    routes: [
      {
        path: '/classes',
        name: PageNames.CLASS_MGMT_PAGE,
      },
      {
        path: '/classes/:id',
        name: PageNames.CLASS_EDIT_MGMT_PAGE,
        params: { id: classId },
        component: ClassEditPage,
      },
      {
        path: '/classes/:id/passwords/',
        name: PageNames.CLASS_PASSWORDS_PAGE,
      },
      {
        path: '/classes/:id/coach-assignment/',
        name: PageNames.CLASS_ASSIGN_COACH,
      },
      {
        path: '/classes/:id/learner-enrollment/',
        name: PageNames.CLASS_ENROLL_LEARNER,
      },
    ],
  });
}

async function renderPage({ facilityConfig = {} } = {}) {
  const store = makeStore();
  store.commit('classEditManagement/SET_STATE', {
    currentClass: { id: classId, name: CLASS_NAME },
    classCoaches: [],
    classLearners: [],
    classes: [],
    dataLoading: false,
    modalShown: false,
  });

  useFacility.mockImplementation(() =>
    useFacilityMock({
      facilityConfig: ref(facilityConfig),
    }),
  );

  const router = createRouter();
  await router.push({ name: PageNames.CLASS_EDIT_MGMT_PAGE, params: { id: classId } });

  return { router, ...render(ClassEditPage, { store, router }) };
}

describe('ClassEditPage', () => {
  it('titles the tab "Edit Class", leaving the class name as the only h1', async () => {
    document.title = '';
    await renderPage();
    await waitFor(() =>
      expect(document.title).toBe(`${pageTitleStrings.documentTitle$()} - Kolibri`),
    );
    const headings = screen.queryAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(CLASS_NAME);
  });

  it('does not show "View Passwords" option when picture_password_settings is null', async () => {
    await renderPage({ facilityConfig: { picture_password_settings: null } });

    const optionsButton = screen.getByRole('button', { name: optionsLabel$() });
    await fireEvent.click(optionsButton);

    expect(screen.queryByText(printPicturePasswordsAction$())).not.toBeInTheDocument();
  });

  it('shows "View Passwords" option when picture_password_settings is not null', async () => {
    await renderPage({
      facilityConfig: { picture_password_settings: { icon_style: 'colored' } },
    });

    const optionsButton = screen.getByRole('button', { name: optionsLabel$() });
    await fireEvent.click(optionsButton);

    expect(screen.getByText(printPicturePasswordsAction$())).toBeInTheDocument();
  });

  it('navigates to passwords page when "View Passwords" is selected', async () => {
    const { router } = await renderPage({
      facilityConfig: { picture_password_settings: { icon_style: 'colored' } },
    });

    const optionsButton = screen.getByRole('button', { name: optionsLabel$() });
    await fireEvent.click(optionsButton);

    const viewPasswordsOption = screen.getByText(printPicturePasswordsAction$());
    await fireEvent.click(viewPasswordsOption);

    expect(router.currentRoute.name).toBe(PageNames.CLASS_PASSWORDS_PAGE);
    expect(router.currentRoute.params.id).toBe(classId);
  });
});
