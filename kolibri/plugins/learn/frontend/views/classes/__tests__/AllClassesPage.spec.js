import Vuex from 'vuex';
import { render, screen } from '@testing-library/vue';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
// eslint-disable-next-line import-x/named
import useUser, { useUserMock } from 'kolibri/composables/useUser';
import { PageNames } from '../../../constants';
import AllClassesPage from '../AllClassesPage.vue';

jest.mock('kolibri/composables/useUser');
jest.mock('kolibri/composables/useTotalProgress');

function renderPage() {
  const store = new Vuex.Store({
    modules: {
      classes: { namespaced: true, state: { classrooms: [] } },
    },
  });
  render(AllClassesPage, { store, routes: [{ name: PageNames.HOME, path: '/' }] });
}

describe('AllClassesPage', () => {
  it('renders a hidden "Classes" h1 for a signed-in learner', () => {
    useUser.mockImplementation(() => useUserMock({ isUserLoggedIn: true }));
    renderPage();
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(coreStrings.classesLabel$());
    expect(headings[0]).toHaveClass('visuallyhidden');
  });

  it("leaves the sign-in message's heading as a guest's only h1", () => {
    useUser.mockImplementation(() => useUserMock());
    renderPage();
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).not.toHaveClass('visuallyhidden');
  });
});
