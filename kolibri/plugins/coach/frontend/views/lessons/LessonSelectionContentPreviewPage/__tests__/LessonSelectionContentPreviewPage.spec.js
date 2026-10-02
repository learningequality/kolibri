import VueRouter from 'vue-router';
import { render, waitFor } from '@testing-library/vue';
import { pageLoading } from 'kolibri-common/composables/usePageLoading';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line import-x/named
import makeStore from '../../../../__tests__/utils/makeStore';
import LessonSelectionContentPreviewPage from '../index.vue';

jest.mock('kolibri/composables/useUser');
jest.mock('kolibri-common/composables/usePageLoading');
jest.mock('kolibri/router', () => ({
  getRoute: jest.fn((name, params) => ({ name, params })),
  getReactiveRoute: jest.fn(() => ({ params: {} })),
}));
jest.mock('kolibri/components/pages/NotificationsRoot/internal/PingbackNotificationResource');
jest.mock(
  'kolibri/components/pages/NotificationsRoot/internal/PingbackNotificationDismissedResource',
);

async function renderPage() {
  useUser.mockImplementation(() => useUserMock({ isCoach: true }));
  const store = makeStore();
  store.commit('lessonSummary/resources/SET_CURRENT_CONTENT_NODE', { title: 'Resource A' });
  const router = new VueRouter({ routes: [{ path: '/preview', name: 'Preview' }] });
  await router.push('/preview');
  return render(LessonSelectionContentPreviewPage, { store, routes: router });
}

describe('LessonSelectionContentPreviewPage', () => {
  afterEach(() => {
    pageLoading.value = false;
  });

  it("does not title the tab with the previous resource's title while loading", async () => {
    pageLoading.value = true;
    await renderPage();
    await waitFor(() => expect(document.title).toBe('Kolibri'));
  });
});
