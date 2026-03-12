import { render, screen } from '@testing-library/vue';
import { mount, createLocalVue } from '@vue/test-utils';
import VueRouter from 'vue-router';
import store from 'kolibri/store';
// eslint-disable-next-line import/named
import useSnackbar, { useSnackbarMock } from 'kolibri/composables/useSnackbar';
import makeStore from '../../../__tests__/utils/makeStore';
import classSummaryModule from '../../../modules/classSummary';
// eslint-disable-next-line import/named
import { useAttendance, useAttendanceMock } from '../../../composables/useAttendance';
// eslint-disable-next-line import/named
import AttendanceNewPage from '../AttendanceNewPage.vue';
import AttendanceHistoryPage from '../AttendanceHistoryPage.vue';
import AttendanceEditPage from '../AttendanceEditPage.vue';

jest.mock('../../../composables/useAttendance');
jest.mock('kolibri/composables/useSnackbar');
jest.mock('../../../composables/useCoreCoach', () => {
  const { ref, computed } = require('vue');
  return {
    __esModule: true,
    default: jest.fn(() => ({
      classId: computed(() => 'test-class'),
      appBarTitle: ref('Coach'),
      initClassInfo: jest.fn(),
      refreshClassSummary: jest.fn(),
      authorized: ref(true),
      pageTitle: ref(''),
      groups: ref([]),
    })),
  };
});

const testLocalVue = createLocalVue();
testLocalVue.use(VueRouter);

const MOCK_LEARNERS = [
  { id: 'learner-c', name: 'Charlie', username: 'charlie' },
  { id: 'learner-a', name: 'Alice', username: 'alice' },
  { id: 'learner-b', name: 'Bob', username: 'bob' },
];

const TEST_STUBS = {
  CoachImmersivePage: {
    name: 'CoachImmersivePage',
    props: ['appBarTitle', 'route'],
    template: '<div><slot /></div>',
  },
  KSwitch: {
    name: 'KSwitch',
    props: ['name', 'value', 'label', 'disabled', 'ariaLabelledBy'],
    template:
      '<button :data-name="name" :data-checked="value" @click="$emit(\'change\', !value)">{{ label }}</button>',
  },
  KButton: {
    name: 'KButton',
    props: ['text', 'primary', 'disabled', 'to'],
    template: '<button :disabled="disabled" @click="$emit(\'click\')">{{ text }}</button>',
  },
  KModal: {
    name: 'KModal',
    props: ['title', 'submitText', 'cancelText'],
    template:
      '<div data-test="modal"><h2>{{ title }}</h2><slot /><button data-test="modal-submit" @click="$emit(\'submit\')">{{ submitText }}</button><button data-test="modal-cancel" @click="$emit(\'cancel\')">{{ cancelText }}</button></div>',
  },
  BottomAppBar: {
    name: 'BottomAppBar',
    template: '<div data-test="bottom-bar"><slot /></div>',
  },
};

function makeNewPageWrapper({
  learners = MOCK_LEARNERS,
  createSessionResult = Promise.resolve({ id: 'new-session' }),
} = {}) {
  const createSession = jest.fn(() =>
    typeof createSessionResult === 'function' ? createSessionResult() : createSessionResult,
  );
  const mockValues = useAttendanceMock({ createSession });
  useAttendance.mockImplementation(() => mockValues);

  const createSnackbar = jest.fn();
  useSnackbar.mockImplementation(() => useSnackbarMock({ createSnackbar }));

  const router = new VueRouter({
    routes: [
      { path: '/class/:classId/attendance/new', name: 'ATTENDANCE_NEW' },
      { path: '/class/:classId/attendance/history', name: 'ATTENDANCE_HISTORY' },
    ],
  });
  router.push({ name: 'ATTENDANCE_NEW', params: { classId: 'test-class' } });

  const testStore = makeStore();
  testStore.state.classSummary.id = 'test-class';
  testStore.state.classSummary.name = 'Test Class';
  const learnerMap = {};
  learners.forEach(l => {
    learnerMap[l.id] = l;
  });
  testStore.state.classSummary.learnerMap = learnerMap;

  // Register classSummary module on global store so getters are available
  if (!store.hasModule('classSummary')) {
    store.registerModule('classSummary', classSummaryModule);
  }
  store.replaceState(testStore.state);

  const wrapper = mount(AttendanceNewPage, {
    store: testStore,
    localVue: testLocalVue,
    router,
    stubs: TEST_STUBS,
  });

  return { wrapper, createSession, createSnackbar, router };
}

describe('AttendanceNewPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(store, 'dispatch').mockImplementation(jest.fn());
    useAttendance.mockImplementation(() => useAttendanceMock());
    useSnackbar.mockImplementation(() => useSnackbarMock());
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (store.hasModule('classSummary')) {
      store.unregisterModule('classSummary');
    }
  });

  it('renders learners sorted alphabetically', async () => {
    const { wrapper } = makeNewPageWrapper();
    await global.flushPromises();
    const rows = wrapper.findAll('tbody tr');
    // Row 0 is the "Mark all learners present" row
    expect(rows.at(1).text()).toContain('Alice');
    expect(rows.at(2).text()).toContain('Bob');
    expect(rows.at(3).text()).toContain('Charlie');
  });

  it('displays the session date and time in the heading', async () => {
    const { wrapper } = makeNewPageWrapper();
    await global.flushPromises();
    const heading = wrapper.find('h1');
    // formatAttendanceDateTime mock returns '2026-03-09' and '10:00 AM'
    expect(heading.text()).toContain('2026-03-09');
    expect(heading.text()).toContain('10:00 AM');
  });

  it('filters learners by search input', async () => {
    const { wrapper } = makeNewPageWrapper();
    await global.flushPromises();

    const filterInput = wrapper.find('input[placeholder]');
    await filterInput.setValue('ali');
    await global.flushPromises();

    const rows = wrapper.findAll('tbody tr');
    // Row 0 is the "Mark all" row, row 1 is the filtered learner
    expect(rows.length).toBe(2);
    expect(rows.at(1).text()).toContain('Alice');
  });

  it('updates present/absent counts when toggling a learner', async () => {
    const { wrapper } = makeNewPageWrapper();
    await global.flushPromises();

    // Initially all absent
    expect(wrapper.text()).toContain('0 present');
    expect(wrapper.text()).toContain('3 absent');

    // Toggle first learner (Alice) to present
    const learnerSwitches = wrapper.findAll('[data-name^="attendance-"]');
    await learnerSwitches.at(0).trigger('click');
    await global.flushPromises();

    expect(wrapper.text()).toContain('1 present');
    expect(wrapper.text()).toContain('2 absent');
  });

  it('shows confirmation modal when marking all present', async () => {
    const { wrapper } = makeNewPageWrapper();
    await global.flushPromises();

    const markAllSwitch = wrapper.find('[data-name="mark-all-present"]');
    await markAllSwitch.trigger('click');
    await global.flushPromises();

    expect(wrapper.find('[data-test="modal"]').exists()).toBe(true);
  });

  it('marks all learners present after confirming modal', async () => {
    const { wrapper } = makeNewPageWrapper();
    await global.flushPromises();

    const markAllSwitch = wrapper.find('[data-name="mark-all-present"]');
    await markAllSwitch.trigger('click');
    await global.flushPromises();

    await wrapper.find('[data-test="modal-submit"]').trigger('click');
    await global.flushPromises();

    expect(wrapper.text()).toContain('3 present');
    expect(wrapper.text()).toContain('0 absent');
  });

  it('calls createSession and shows success snackbar on submit', async () => {
    const { wrapper, createSession, createSnackbar } = makeNewPageWrapper();
    await global.flushPromises();

    // Toggle a learner to mark dirty
    const learnerSwitches = wrapper.findAll('[data-name^="attendance-"]');
    await learnerSwitches.at(0).trigger('click');
    await global.flushPromises();

    // Click save
    const saveButton = wrapper
      .findAll('button')
      .wrappers.find(w => w.text() === 'Submit attendance');
    await saveButton.trigger('click');
    await global.flushPromises();

    expect(createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'test-class',
        attendance_records: expect.arrayContaining([expect.objectContaining({ present: true })]),
      }),
    );
    expect(createSnackbar).toHaveBeenCalled();
  });

  it('shows error snackbar and stays on page when submit fails', async () => {
    const { wrapper, createSnackbar, router } = makeNewPageWrapper({
      createSessionResult: () => Promise.reject(new Error('API error')),
    });
    await global.flushPromises();

    const initialRoute = router.currentRoute.name;

    // Toggle a learner
    const learnerSwitches = wrapper.findAll('[data-name^="attendance-"]');
    await learnerSwitches.at(0).trigger('click');
    await global.flushPromises();

    // Click save
    const saveButton = wrapper
      .findAll('button')
      .wrappers.find(w => w.text() === 'Submit attendance');
    await saveButton.trigger('click');
    await global.flushPromises();

    expect(createSnackbar).toHaveBeenCalled();
    expect(router.currentRoute.name).toBe(initialRoute);
  });

  it('sets isDirty when a learner is toggled', async () => {
    const { wrapper } = makeNewPageWrapper();
    await global.flushPromises();

    expect(wrapper.vm.isDirty).toBe(false);

    const learnerSwitches = wrapper.findAll('[data-name^="attendance-"]');
    await learnerSwitches.at(0).trigger('click');
    await global.flushPromises();

    expect(wrapper.vm.isDirty).toBe(true);
  });

  it('isDirty remains true even if learner is toggled back to absent', async () => {
    const { wrapper } = makeNewPageWrapper();
    await global.flushPromises();

    const learnerSwitches = wrapper.findAll('[data-name^="attendance-"]');
    await learnerSwitches.at(0).trigger('click');
    await global.flushPromises();
    await learnerSwitches.at(0).trigger('click');
    await global.flushPromises();

    expect(wrapper.vm.isDirty).toBe(true);
  });

  it('beforeRouteLeave shows unsaved modal when isDirty is true', async () => {
    const { wrapper } = makeNewPageWrapper();
    await global.flushPromises();

    const learnerSwitches = wrapper.findAll('[data-name^="attendance-"]');
    await learnerSwitches.at(0).trigger('click');
    await global.flushPromises();

    const next = jest.fn();
    const guard = wrapper.vm.$options.beforeRouteLeave;
    const guardFn = Array.isArray(guard) ? guard[0] : guard;
    guardFn.call(wrapper.vm, { name: 'other' }, {}, next);

    expect(next).toHaveBeenCalledWith(false);
    expect(wrapper.vm.pendingRoute).not.toBeNull();
  });

  it('confirming unsaved modal allows navigation', async () => {
    const { wrapper } = makeNewPageWrapper();
    await global.flushPromises();

    const learnerSwitches = wrapper.findAll('[data-name^="attendance-"]');
    await learnerSwitches.at(0).trigger('click');
    await global.flushPromises();

    const next = jest.fn();
    const guard = wrapper.vm.$options.beforeRouteLeave;
    const guardFn = Array.isArray(guard) ? guard[0] : guard;
    guardFn.call(
      wrapper.vm,
      { name: 'ATTENDANCE_HISTORY', params: { classId: 'test-class' } },
      {},
      next,
    );
    await global.flushPromises();

    await wrapper.find('[data-test="modal-submit"]').trigger('click');
    await global.flushPromises();

    expect(wrapper.vm.isDirty).toBe(false);
    expect(wrapper.vm.pendingRoute).toBeNull();
  });
});

describe('AttendanceHistoryPage', () => {
  it('renders the page heading', () => {
    render(AttendanceHistoryPage);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Attendance History');
  });
});

describe('AttendanceEditPage', () => {
  it('renders the page heading', () => {
    render(AttendanceEditPage);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Edit Attendance');
  });
});
