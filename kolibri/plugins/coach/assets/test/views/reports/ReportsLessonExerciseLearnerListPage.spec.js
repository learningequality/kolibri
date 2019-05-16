import { mount, createLocalVue, RouterLinkStub } from '@vue/test-utils';
import VueRouter from 'vue-router';

import { STATUSES } from '../../../src/modules/classSummary/constants';
import makeStore from '../../makeStore';
import ReportsLessonExerciseLearnerListPage from '../../../src/views/reports/ReportsLessonExerciseLearnerListPage';

const localVue = createLocalVue();
localVue.use(VueRouter);

// commonCoach mixin imports kolibri customized router and uses getRoute method
jest.mock('kolibri.coreVue.router', () => {
  return {
    getRoute: (name, params, query) => {
      return { name, params, query };
    },
  };
});

const LESSON_ID = 'lesson-id';
const EXERCISE_ID = 'exercise-id';

const LEARNER_1 = {
  id: 'learner1',
  name: 'learner1 name',
};

const LEARNER_2 = {
  id: 'learner2',
  name: 'learner2 name',
};

const LEARNER_3 = {
  id: 'learner3',
  name: 'learner3 name',
};

const GROUP_1 = {
  id: 'group1',
  name: 'group1 name',
  member_ids: [LEARNER_1.id, LEARNER_2.id],
};

const GROUP_2 = {
  id: 'group2',
  name: 'group2 name',
  member_ids: [LEARNER_2.id],
};

const GROUP_3 = {
  id: 'group3',
  name: 'group3 name',
  member_ids: [],
};

const ROUTE_ALL_LEARNERS = {
  name: 'FakeReportsLessonExerciseLearnerListPage',
  params: {
    lessonId: LESSON_ID,
    exerciseId: EXERCISE_ID,
  },
};

const ROUTE_LEARNERS_BY_GROUP = {
  ...ROUTE_ALL_LEARNERS,
  query: {
    groups: 'true',
  },
};

const router = new VueRouter({
  routes: [
    {
      path: '/reports/lessons/:lessonId/exercises/:exerciseId/learners',
      name: 'FakeReportsLessonExerciseLearnerListPage',
    },
  ],
});

const getViewByGroupsCheckbox = wrapper => {
  return wrapper.find({ name: 'KCheckbox' }).find('input');
};

const getGroupTitles = wrapper => {
  return wrapper.findAll('[data-test="group-title"]');
};

const getSummaryTally = wrapper => {
  return wrapper.find('[data-test="summary-tally"]');
};

const getGroup = (wrapper, groupId) => {
  return wrapper.find(`[data-test="group-${groupId}"]`);
};

const getGroupTally = (wrapper, groupId) => {
  return getGroup(wrapper, groupId).find({ name: 'StatusSummary' });
};

const initWrapper = lessonMap => {
  if (!lessonMap) {
    lessonMap = {
      [LESSON_ID]: {
        groups: [],
      },
    };
  }

  const groupMap = {
    group1: GROUP_1,
    group2: GROUP_2,
    group3: GROUP_3,
  };

  const learnerMap = {
    learner1: LEARNER_1,
    learner2: LEARNER_2,
    learner3: LEARNER_3,
  };

  const contentLearnerStatusMap = {
    [EXERCISE_ID]: {
      [LEARNER_1.id]: {
        learner_id: LEARNER_1.id,
        content_id: EXERCISE_ID,
        status: STATUSES.started,
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
      [LEARNER_3.id]: {
        learner_id: LEARNER_3.id,
        content_id: EXERCISE_ID,
        status: STATUSES.notStarted,
        last_activity: new Date('2019-05-05T08:30:00Z'),
        time_spent: 760,
      },
    },
  };

  const contentMap = {
    [EXERCISE_ID]: {
      title: 'Compare 3-digit numbers',
    },
  };

  const store = makeStore();

  store.state.classSummary = {
    ...store.state.classSummary,
    lessonMap,
    groupMap,
    learnerMap,
    contentMap,
    contentLearnerStatusMap,
  };

  router.push(ROUTE_ALL_LEARNERS);

  const wrapper = mount(ReportsLessonExerciseLearnerListPage, {
    store,
    localVue,
    router,
    stubs: {
      CoreBase: true, // avoid auth setup etc. for now since specs are currently
      // dealing mostly with grouping
      TopNavbar: true, // same as above
      RouterLink: RouterLinkStub,
    },
  });

  return wrapper;
};

describe('ReportsLessonExerciseLearnerListPage', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = initWrapper();
  });

  it('renders view by groups checkbox as unchecked when group not in url query', () => {
    expect(getViewByGroupsCheckbox(wrapper).element.checked).toBe(false);
  });

  it('renders view by groups checkbox as checked when group in url query', () => {
    router.push(ROUTE_LEARNERS_BY_GROUP);
    expect(getViewByGroupsCheckbox(wrapper).element.checked).toBe(true);
  });

  it('toggles url query on view by groups click', () => {
    getViewByGroupsCheckbox(wrapper).setChecked(true);
    expect(wrapper.vm.$route.query.groups).toBe('true');

    getViewByGroupsCheckbox(wrapper).setChecked(false);
    expect(wrapper.vm.$route.query.groups).toBeUndefined();
  });

  describe('for an entire class lesson', () => {
    let lessonMap;

    beforeEach(() => {
      lessonMap = {
        [LESSON_ID]: {
          groups: [],
        },
      };
    });

    describe('when displaying all learners', () => {
      beforeEach(() => {
        wrapper = initWrapper(lessonMap);
      });

      it('renders all class learners', () => {
        expect(wrapper.html()).toContain(LEARNER_1.name);
        expect(wrapper.html()).toContain(LEARNER_2.name);
        expect(wrapper.html()).toContain(LEARNER_3.name);
      });

      it('renders a correct summary tally', () => {
        expect(getSummaryTally(wrapper).html()).toMatchSnapshot();
      });
    });

    describe('when displaying learners by groups', () => {
      beforeEach(() => {
        wrapper = initWrapper(lessonMap);
        router.push(ROUTE_LEARNERS_BY_GROUP);
      });

      it('renders all class learners', () => {
        expect(wrapper.html()).toContain(LEARNER_1.name);
        expect(wrapper.html()).toContain(LEARNER_2.name);
        expect(wrapper.html()).toContain(LEARNER_3.name);
      });

      it('renders all lesson groups including empty ones and ungrouped learners section', () => {
        const groupTitles = getGroupTitles(wrapper);

        expect(groupTitles.length).toBe(4);

        expect(groupTitles.at(0).text()).toBe(GROUP_1.name);
        expect(groupTitles.at(1).text()).toBe(GROUP_2.name);
        expect(groupTitles.at(2).text()).toBe(GROUP_3.name);
        expect(groupTitles.at(3).text()).toBe('Ungrouped learners');
      });

      it('renders a correct group tally', () => {
        expect(getGroupTally(wrapper, GROUP_1.id).html()).toMatchSnapshot();
        expect(getGroupTally(wrapper, GROUP_2.id).html()).toMatchSnapshot();
        expect(getGroupTally(wrapper, GROUP_3.id).html()).toMatchSnapshot();
      });
    });
  });

  describe('for a lesson restricted to some groups recipents only', () => {
    let lessonMap;

    beforeEach(() => {
      lessonMap = {
        [LESSON_ID]: {
          groups: [GROUP_2.id, GROUP_3.id],
        },
      };
    });

    describe('when displaying all learners', () => {
      beforeEach(() => {
        wrapper = initWrapper(lessonMap);
      });

      it('renders only class learners assigned to a lesson groups', () => {
        expect(wrapper.html()).not.toContain(LEARNER_1.name);
        expect(wrapper.html()).not.toContain(LEARNER_3.name);

        expect(wrapper.html()).toContain(LEARNER_2.name);
      });

      it('renders a correct summary tally', () => {
        expect(getSummaryTally(wrapper).html()).toMatchSnapshot();
      });
    });

    describe('when displaying learners by groups', () => {
      beforeEach(() => {
        wrapper = initWrapper(lessonMap);
        router.push(ROUTE_LEARNERS_BY_GROUP);
      });

      it('renders only class learners assigned to a lesson groups', () => {
        expect(wrapper.html()).not.toContain(LEARNER_1.name);
        expect(wrapper.html()).not.toContain(LEARNER_3.name);

        expect(wrapper.html()).toContain(LEARNER_2.name);
      });

      it('renders only lesson groups including empty ones', () => {
        const groupTitles = getGroupTitles(wrapper);

        expect(groupTitles.length).toBe(2);
        expect(groupTitles.at(0).text()).toBe(GROUP_2.name);
        expect(groupTitles.at(1).text()).toBe(GROUP_3.name);
      });

      it('renders a correct group tally', () => {
        expect(getGroupTally(wrapper, GROUP_2.id).html()).toMatchSnapshot();
        expect(getGroupTally(wrapper, GROUP_3.id).html()).toMatchSnapshot();
      });
    });
  });
});
