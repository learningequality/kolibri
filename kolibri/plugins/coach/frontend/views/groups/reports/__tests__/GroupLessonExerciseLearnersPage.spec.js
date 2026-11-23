import { mount, createLocalVue, enableAutoDestroy, RouterLinkStub } from '@vue/test-utils';
import VueRouter from 'vue-router';
import { emulatePrintMedia } from 'testUtils'; // eslint-disable-line

import { STATUSES } from '../../../../modules/classSummary/constants';
import { PageNames } from '../../../../constants';
import makeStore from '../../../../__tests__/utils/makeStore';
import store from '../../../../store';
import GroupLessonExerciseLearnersPage from '../GroupLessonExerciseLearnersPage';

const localVue = createLocalVue();
localVue.use(VueRouter);

enableAutoDestroy(afterEach);

jest.mock('kolibri/router', () => {
  return {
    getRoute: (name, params, query) => {
      return { name, params, query };
    },
  };
});
jest.mock('../../../../composables/fetchClassSyncStatus', () => ({
  fetchClassSyncStatus: jest.fn(() => Promise.resolve([])),
}));
jest.mock('../../../../composables/useCoreCoach', () => {
  return () => {
    return {
      appBarTitle: '',
    };
  };
});

const LESSON_ID = 'lesson-id';
const EXERCISE_ID = 'exercise-id';
const GROUP_ID = 'group1';

const LEARNER_1 = {
  id: 'learner1',
  name: 'learner1 name',
};

const LEARNER_2 = {
  id: 'learner2',
  name: 'learner2 name',
};

const GROUP_1 = {
  id: GROUP_ID,
  name: 'group1 name',
  member_ids: [LEARNER_1.id, LEARNER_2.id],
};

const router = new VueRouter({
  routes: [
    {
      path: '/reports/groups/:groupId/lessons/:lessonId/exercises/:exerciseId/learners',
      name: PageNames.GROUP_LESSON_EXERCISE_LEARNER_REPORT,
    },
  ],
});

const getSummaryTally = wrapper => {
  return wrapper.find('[data-testid="summary-tally"]');
};

const getPrintExportButtons = wrapper => {
  return wrapper.find('.report-controls-buttons');
};

const initWrapper = () => {
  const groupMap = {
    [GROUP_ID]: GROUP_1,
  };

  const learnerMap = {
    [LEARNER_1.id]: LEARNER_1,
    [LEARNER_2.id]: LEARNER_2,
  };

  const lessonMap = {
    [LESSON_ID]: {
      title: 'Clothing lesson',
      groups: [],
      assignments: [],
      learner_ids: [],
    },
  };

  const contentLearnerStatusMap = {
    [EXERCISE_ID]: {
      [LEARNER_1.id]: {
        learner_id: LEARNER_1.id,
        content_id: EXERCISE_ID,
        status: STATUSES.completed,
        last_activity: new Date('2019-05-04T07:00:00Z'),
        time_spent: 300,
      },
      [LEARNER_2.id]: {
        learner_id: LEARNER_2.id,
        content_id: EXERCISE_ID,
        status: STATUSES.completed,
        last_activity: new Date('2019-05-05T08:00:00Z'),
        time_spent: 120,
      },
    },
  };

  const contentMap = {
    [EXERCISE_ID]: {
      title: 'Boys’ Clothing',
    },
  };

  store.replaceState(makeStore().state);

  store.state.classSummary = {
    ...store.state.classSummary,
    id: 'classroom',
    name: 'classroom',
    groupMap,
    learnerMap,
    lessonMap,
    contentMap,
    contentLearnerStatusMap,
  };
  store.commit('resourceDetail/SET_STATE', { resource: contentMap[EXERCISE_ID] });

  router
    .push({
      name: PageNames.GROUP_LESSON_EXERCISE_LEARNER_REPORT,
      params: {
        groupId: GROUP_ID,
        lessonId: LESSON_ID,
        exerciseId: EXERCISE_ID,
      },
    })
    .catch(() => {});

  const wrapper = mount(GroupLessonExerciseLearnersPage, {
    store,
    localVue,
    router,
    stubs: {
      CoachAppBarPage: true,
      RouterLink: RouterLinkStub,
    },
  });

  return wrapper;
};

describe('GroupLessonExerciseLearnersPage', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = initWrapper();
  });

  it('renders the status summary and the print/export buttons on screen', () => {
    expect(getSummaryTally(wrapper).element).toHaveTextContent('Completed by 2 of 2');
    expect(getPrintExportButtons(wrapper).exists()).toBe(true);
  });

  describe('when printing', () => {
    emulatePrintMedia(beforeEach, afterEach);

    it('renders the status summary', () => {
      wrapper.destroy();
      wrapper = initWrapper();
      expect(getSummaryTally(wrapper).element).toHaveTextContent('Completed by 2 of 2');
    });

    it('does not render the print and export buttons', () => {
      wrapper.destroy();
      wrapper = initWrapper();
      expect(getPrintExportButtons(wrapper).isVisible()).toBe(false);
    });
  });
});
