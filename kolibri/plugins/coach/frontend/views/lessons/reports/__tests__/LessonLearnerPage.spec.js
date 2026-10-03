import { nextTick } from 'vue';
import { mount, createLocalVue, enableAutoDestroy, RouterLinkStub } from '@vue/test-utils';
import VueRouter from 'vue-router';
import { coachStrings } from '../../../common/commonCoachStrings';
import makeStore from '../../../../__tests__/utils/makeStore';
import store from '../../../../store';
import LessonLearnerPage from '../LessonLearnerPage';

const localVue = createLocalVue();
localVue.use(VueRouter);

enableAutoDestroy(afterEach);

jest.mock('kolibri/router', () => ({
  getRoute: (name, params, query) => ({ name, params, query }),
}));
jest.mock('../../../../composables/fetchClassSyncStatus', () => ({
  fetchClassSyncStatus: jest.fn(() => Promise.resolve([])),
}));
jest.mock('../../../../composables/useCoreCoach', () => () => ({ appBarTitle: '' }));

const ROUTE_NAME = 'FakeLessonLearnerPage';

const router = new VueRouter({
  routes: [{ path: '/lessons/:lessonId/learners/:learnerId/:groupId?', name: ROUTE_NAME }],
});

async function renderPage(params) {
  store.replaceState(makeStore().state);
  store.state.classSummary = {
    ...store.state.classSummary,
    id: 'class',
    name: 'Class 1',
    lessonMap: { lesson: { title: 'Lesson One', node_ids: [] } },
    learnerMap: { learner: { id: 'learner', name: 'Learner One' } },
    groupMap: { group: { id: 'group', name: 'Group One' } },
  };
  await router
    .push({ name: ROUTE_NAME, params: { lessonId: 'lesson', ...params } })
    .catch(() => {});
  mount(LessonLearnerPage, {
    store,
    localVue,
    router,
    stubs: { CoachAppBarPage: true, RouterLink: RouterLinkStub },
  });
  await nextTick();
}

describe('LessonLearnerPage', () => {
  it('titles the tab with learner, lesson and class on the learner route', async () => {
    await renderPage({ learnerId: 'learner' });
    expect(document.title).toBe('Learner One - Lesson One - Class 1 - Kolibri');
  });

  it('titles the tab with learners label, lesson, group and class on the group route', async () => {
    await renderPage({ learnerId: 'learner', groupId: 'group' });
    expect(document.title).toBe(
      `${coachStrings.learnersLabel$()} - Lesson One - Group One - Class 1 - Kolibri`,
    );
  });
});
