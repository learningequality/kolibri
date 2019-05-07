import { mount, createLocalVue, RouterLinkStub } from '@vue/test-utils';
import VueRouter from 'vue-router';

import makeStore from '../../makeStore';
import ReportsLessonResourceLearnerListPage from '../../../src/views/reports/ReportsLessonResourceLearnerListPage';

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

const ROUTE_NAME = 'FakeReportsLessonResourceLearnerListPage';

const LESSON_ID = 'lesson-id';
const RESOURCE_ID = 'resource-id';

const ROUTE_ALL_LEARNERS = {
  name: ROUTE_NAME,
  params: {
    lessonId: LESSON_ID,
    resourceId: RESOURCE_ID,
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
      path: '/reports/lessons/:lessonId/resources/:resourceId/learners',
      name: ROUTE_NAME,
    },
  ],
});

const getViewByGroupsCheckbox = wrapper => {
  return wrapper.find({ name: 'KCheckbox' }).find('input');
};

const initWrapper = lessonMap => {
  if (!lessonMap) {
    lessonMap = {
      [LESSON_ID]: {
        groups: [],
      },
    };
  }
  const contentMap = {
    [RESOURCE_ID]: {
      title: 'Boys’ Clothing',
    },
  };

  const store = makeStore();

  store.state.classSummary = {
    ...store.state.classSummary,
    lessonMap,
    contentMap,
  };

  router.push(ROUTE_ALL_LEARNERS);

  const wrapper = mount(ReportsLessonResourceLearnerListPage, {
    store,
    localVue,
    router,
    stubs: {
      // avoid auth setup etc. for now since specs are currently dealing mostly with grouping
      CoreBase: true,
      RouterLink: RouterLinkStub,
    },
  });

  return wrapper;
};

describe('ReportsLessonResourceLearnerListPage', () => {
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
});
