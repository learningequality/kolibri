import { render, screen } from '@testing-library/vue';
import Vuex from 'vuex';
import VueRouter from 'vue-router';
import { ref } from 'vue';
import '@testing-library/jest-dom';
import CoursesRootPage from '../CoursesRootPage.vue';

// Stub all heavy dependencies
jest.mock('kolibri-common/apiResources/CourseSessionResource');
jest.mock('kolibri-common/apiResources/ContentNodeResource');
jest.mock('kolibri/composables/useSnackbar', () => ({
  __esModule: true,
  default: () => ({ createSnackbar: jest.fn() }),
}));

const mockCoursesRef = ref([]);
const mockCoursesAreLoading = ref(false);
const mockCourses = {
  courses: mockCoursesRef,
  coursesAreLoading: mockCoursesAreLoading,
  setCourses: jest.fn(),
  updateCourse: jest.fn(),
  removeCourse: jest.fn(),
  refreshClassCourses: jest.fn().mockResolvedValue([]),
  classId: ref('class-123'),
};

jest.mock('../../../composables/useCourses', () => ({
  useCourses: () => mockCourses,
}));

jest.mock('../composables/useAssignCourse', () => ({
  __esModule: true,
  default: () => ({
    resetAssignment: jest.fn(),
    selectCourse: jest.fn(),
    setCourseVisibility: jest.fn(),
    setExistingAssignment: jest.fn(),
  }),
}));

jest.mock('kolibri-common/strings/coursesStrings', () => ({
  coursesStrings: new Proxy(
    {},
    {
      get: (_, key) => {
        if (key === '$tr') return jest.fn(key => key);
        return jest.fn(() => key);
      },
    },
  ),
}));

jest.mock('kolibri/uiText/commonCoreStrings', () => {
  const coreString = jest.fn(key => key);
  return {
    coreString,
    coreStrings: new Proxy(
      {},
      {
        get: (_, key) => {
          if (key === '$tr') return coreString;
          return jest.fn(() => key);
        },
      },
    ),
  };
});

jest.mock('vue-router/composables', () => ({
  useRoute: () => ({
    params: { classId: 'class-123' },
    query: {},
    name: 'CoursesRoot',
  }),
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('../../../views/common/commonCoachStrings', () => ({
  coachStrings: new Proxy(
    {},
    {
      get: (_, key) => {
        if (key === '$tr') return jest.fn(key => key);
        return jest.fn(() => key);
      },
    },
  ),
}));

function makeStore() {
  return new Vuex.Store({
    actions: {
      initClassInfo: jest.fn(),
      notLoading: jest.fn(),
    },
    modules: {
      classSummary: {
        namespaced: true,
        state: { id: 'class-123' },
        getters: {
          groups: () => [],
        },
      },
    },
  });
}

const STUBS = {
  CoachAppBarPage: {
    name: 'CoachAppBarPage',
    template: '<div><slot /></div>',
  },
  CoachHeader: {
    name: 'CoachHeader',
    template: '<div><slot name="actions" /></div>',
  },
  CoreTable: {
    name: 'CoreTable',
    template: '<div data-testid="courses-table"><slot name="headers" /><slot name="tbody" /></div>',
  },
  FilterTextbox: {
    name: 'FilterTextbox',
    template: '<div />',
  },
  AssignCourseSuccessModal: {
    name: 'AssignCourseSuccessModal',
    template: '<div />',
  },
  DeleteCourseConfirmationModal: {
    name: 'DeleteCourseConfirmationModal',
    template: '<div />',
  },
  RouterView: {
    name: 'RouterView',
    template: '<div />',
  },
  KRouterLink: {
    name: 'KRouterLink',
    props: ['to', 'text'],
    template: '<a>{{ text }}</a>',
  },
  MissingResourceAlert: {
    name: 'MissingResourceAlert',
    template: '<div data-testid="missing-resource-alert">Resources missing</div>',
  },
  KDropdownMenu: {
    name: 'KDropdownMenu',
    props: ['options'],
    template:
      '<ul data-testid="dropdown-menu"><li v-for="opt in options" :key="opt">{{ opt }}</li></ul>',
  },
  KSwitch: {
    name: 'KSwitch',
    props: ['disabled', 'checked', 'value', 'name'],
    template:
      '<button data-testid="visibility-toggle" role="switch" :disabled="disabled" :aria-checked="String(!!value)" />',
  },
};

describe('CoursesRootPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCoursesRef.value = [];
    mockCoursesAreLoading.value = false;
  });

  describe('MissingResourceAlert', () => {
    it('should show MissingResourceAlert when any course has contentMissing', () => {
      mockCoursesRef.value = [
        { id: 'session-1', title: 'Course 1', active: true, contentMissing: false },
        { id: 'session-2', title: 'Course 2', active: true, contentMissing: true },
      ];

      render(CoursesRootPage, {
        store: makeStore(),
        routes: new VueRouter({ routes: [{ path: '/', name: 'CoursesRoot' }] }),
        stubs: STUBS,
      });

      expect(screen.getByTestId('missing-resource-alert')).toBeInTheDocument();
    });

    it('should not show MissingResourceAlert when no courses have contentMissing', () => {
      mockCoursesRef.value = [
        { id: 'session-1', title: 'Course 1', active: true, contentMissing: false },
        { id: 'session-2', title: 'Course 2', active: true, contentMissing: false },
      ];

      render(CoursesRootPage, {
        store: makeStore(),
        routes: new VueRouter({ routes: [{ path: '/', name: 'CoursesRoot' }] }),
        stubs: STUBS,
      });

      expect(screen.queryByTestId('missing-resource-alert')).not.toBeInTheDocument();
    });
  });

  describe('course menu options when content is missing', () => {
    it('should only show delete option for courses with missing content', () => {
      mockCoursesRef.value = [
        { id: 'session-1', title: 'Course 1', active: true, contentMissing: true },
      ];

      render(CoursesRootPage, {
        store: makeStore(),
        routes: new VueRouter({ routes: [{ path: '/', name: 'CoursesRoot' }] }),
        stubs: STUBS,
      });

      const menu = screen.getByTestId('dropdown-menu');
      expect(menu).toHaveTextContent('deleteAction');
      expect(menu).not.toHaveTextContent('courseDetailsAction$');
      expect(menu).not.toHaveTextContent('editRecipientsAction$');
    });

    it('should show all options for courses with content present', () => {
      mockCoursesRef.value = [
        { id: 'session-1', title: 'Course 1', active: true, contentMissing: false },
      ];

      render(CoursesRootPage, {
        store: makeStore(),
        routes: new VueRouter({ routes: [{ path: '/', name: 'CoursesRoot' }] }),
        stubs: STUBS,
      });

      const menu = screen.getByTestId('dropdown-menu');
      expect(menu).toHaveTextContent('courseDetailsAction$');
      expect(menu).toHaveTextContent('editRecipientsAction$');
      expect(menu).toHaveTextContent('deleteAction');
    });
  });

  describe('visibility toggle when content is missing', () => {
    it('should disable visibility toggle for courses with missing content', () => {
      mockCoursesRef.value = [
        { id: 'session-1', title: 'Course 1', active: true, contentMissing: true },
      ];

      render(CoursesRootPage, {
        store: makeStore(),
        routes: new VueRouter({ routes: [{ path: '/', name: 'CoursesRoot' }] }),
        stubs: STUBS,
      });

      const toggle = screen.getByRole('switch');
      expect(toggle).toBeDisabled();
    });

    it('should enable visibility toggle for courses with content present', () => {
      mockCoursesRef.value = [
        { id: 'session-1', title: 'Course 1', active: true, contentMissing: false },
      ];

      render(CoursesRootPage, {
        store: makeStore(),
        routes: new VueRouter({ routes: [{ path: '/', name: 'CoursesRoot' }] }),
        stubs: STUBS,
      });

      const toggle = screen.getByRole('switch');
      expect(toggle).toBeEnabled();
    });
  });
});
