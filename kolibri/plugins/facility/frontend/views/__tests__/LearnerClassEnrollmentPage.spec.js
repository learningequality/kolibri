import { render, screen, waitFor } from '@testing-library/vue';
import VueRouter from 'vue-router';
import { pageLoading } from 'kolibri-common/composables/usePageLoading';
import store from '../../store';
import { PageNames } from '../../constants';
import LearnerClassEnrollmentPage, { pageTitleStrings } from '../LearnerClassEnrollmentPage.vue';

jest.mock('kolibri/composables/useUser');

const CLASS_NAME = 'Test Class';

const { pageHeader$ } = pageTitleStrings;

async function renderPage() {
  const router = new VueRouter({
    routes: [
      { path: '/classes/:id', name: PageNames.CLASS_EDIT_MGMT_PAGE },
      { path: '/classes/:id/learner-enrollment/', name: PageNames.CLASS_ENROLL_LEARNER },
    ],
  });
  await router.push({ name: PageNames.CLASS_ENROLL_LEARNER, params: { id: 'class-1' } });
  return render(LearnerClassEnrollmentPage, { store, router });
}

describe('LearnerClassEnrollmentPage', () => {
  beforeEach(() => {
    store.commit('classAssignMembers/RESET_STATE');
    pageLoading.value = false;
  });

  it('titles the tab with its visible header once the class loads', async () => {
    document.title = '';
    await renderPage();
    store.commit('classAssignMembers/SET_STATE', { class: { id: 'class-1', name: CLASS_NAME } });
    const title = pageHeader$({ className: CLASS_NAME });
    await waitFor(() => expect(document.title).toBe(`${title} - Kolibri`));
    const headings = screen.queryAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(title);
  });
});
