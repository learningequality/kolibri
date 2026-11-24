import { render, screen } from '@testing-library/vue';
import VueRouter from 'vue-router';
import { pageLoading } from 'kolibri-common/composables/usePageLoading';
import store from '../../../store';
import { ClassesPageNames, PageNames } from '../../../constants';
import LessonPlaylistPage from '../LessonPlaylistPage';

jest.mock('kolibri/client');
jest.mock('kolibri/urls');

const PREVIOUS_LESSON = { id: 'previous-lesson', title: 'Previous lesson', resources: [] };

async function renderLessonPlaylist(lessonId) {
  const router = new VueRouter({
    routes: [
      { path: '/', name: PageNames.HOME },
      { name: ClassesPageNames.LESSON_PLAYLIST, path: '/classes/:classId/lesson/:lessonId' },
      { name: ClassesPageNames.CLASS_ASSIGNMENTS, path: '/classes/:classId' },
    ],
  });
  await router.push({
    name: ClassesPageNames.LESSON_PLAYLIST,
    params: { classId: 'class-id', lessonId },
  });
  store.commit('lessonPlaylist/SET_CURRENT_LESSON', PREVIOUS_LESSON);
  render({ render: h => h(LessonPlaylistPage) }, { store, router });
}

describe('LessonPlaylistPage', () => {
  beforeEach(() => {
    pageLoading.value = true;
  });

  it('renders no heading for the previous lesson while the next one loads', async () => {
    await renderLessonPlaylist('next-lesson');
    expect(screen.queryByRole('heading', { name: PREVIOUS_LESSON.title })).not.toBeInTheDocument();
  });

  it('renders the h1 for the stored lesson when it is the one opened', async () => {
    await renderLessonPlaylist(PREVIOUS_LESSON.id);
    expect(
      screen.getByRole('heading', { level: 1, name: PREVIOUS_LESSON.title }),
    ).toBeInTheDocument();
  });
});
