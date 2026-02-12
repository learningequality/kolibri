import { mount, createLocalVue } from '@vue/test-utils';
import VueRouter from 'vue-router';
import makeStore from '../../../__tests__/utils/makeStore';
import MarkAttendancePage from '../MarkAttendancePage.vue';

const localVue = createLocalVue();
localVue.use(VueRouter);

jest.mock('kolibri/router', () => ({
  getRoute: (name, params, query) => ({ name, params, query }),
}));

jest.mock('../../../composables/useCoreCoach', () => () => ({
  pageTitle: '',
  appBarTitle: '',
}));

const mockCreateSession = jest.fn().mockResolvedValue({
  id: 'session-1',
  date: '2026-02-11',
  session_number: 1,
});
const mockSubmitAttendance = jest.fn().mockResolvedValue([]);
const mockFetchRecords = jest.fn().mockResolvedValue([]);
const mockResetState = jest.fn();
const mockCreateSnackbar = jest.fn();

jest.mock('kolibri/composables/useSnackbar', () => ({
  __esModule: true,
  default: () => ({
    createSnackbar: mockCreateSnackbar,
  }),
}));

jest.mock('../../../composables/useAttendance', () => {
  const { ref } = require('vue');
  return {
    __esModule: true,
    default: () => ({
      currentSession: ref({ id: 'session-1', date: '2026-02-11', session_number: 1 }),
      records: ref([]),
      createSession: mockCreateSession,
      fetchRecords: mockFetchRecords,
      submitAttendance: mockSubmitAttendance,
      resetState: mockResetState,
    }),
  };
});

const LEARNER_1 = { id: 'learner-a', name: 'Alice' };
const LEARNER_2 = { id: 'learner-b', name: 'Bob' };
const LEARNER_3 = { id: 'learner-c', name: 'Charlie' };

const CLASSROOM = {
  id: 'classroom-1',
  name: 'Test Classroom',
  member_ids: [LEARNER_1.id, LEARNER_2.id, LEARNER_3.id],
};

const router = new VueRouter({
  routes: [
    { path: '/:classId/attendance/new', name: 'ATTENDANCE_ROOT' },
    { path: '/:classId/home', name: 'HomePage' },
  ],
});

function initWrapper() {
  const store = makeStore();
  store.state.classSummary = {
    ...store.state.classSummary,
    id: CLASSROOM.id,
    name: CLASSROOM.name,
    learnerMap: {
      [LEARNER_1.id]: LEARNER_1,
      [LEARNER_2.id]: LEARNER_2,
      [LEARNER_3.id]: LEARNER_3,
    },
  };

  router.push({ name: 'ATTENDANCE_ROOT', params: { classId: CLASSROOM.id } }).catch(() => {});

  return mount(MarkAttendancePage, {
    store,
    localVue,
    router,
    stubs: {
      CoachAppBarPage: {
        template: '<div><slot /><slot name="bottom" /></div>',
      },
      BottomAppBar: { template: '<div><slot /></div>' },
      KSwitch: {
        template: '<button @click="$emit(\'change\', !checked)">switch</button>',
        props: ['checked', 'value'],
      },
    },
  });
}

describe('MarkAttendancePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the session title', () => {
    const wrapper = initWrapper();
    expect(wrapper.find('h1').text()).toContain('Session 1');
  });

  it('displays learners sorted alphabetically', () => {
    const wrapper = initWrapper();
    const rows = wrapper.findAll('tbody tr');
    expect(rows.at(0).text()).toContain('Alice');
    expect(rows.at(1).text()).toContain('Bob');
    expect(rows.at(2).text()).toContain('Charlie');
  });

  it('shows correct initial present/absent counts', () => {
    const wrapper = initWrapper();
    expect(wrapper.vm.presentCount).toBe(0);
    expect(wrapper.vm.absentCount).toBe(3);
  });

  it('updates counts when toggling attendance', async () => {
    const wrapper = initWrapper();
    const switches = wrapper.findAllComponents({ name: 'KSwitch' });
    await switches.at(0).vm.$emit('change', true);
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('1 present');
    expect(wrapper.text()).toContain('2 absent');
  });

  it('mark all present sets all learners to present', async () => {
    const wrapper = initWrapper();
    await wrapper.vm.markAllPresent();
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.presentCount).toBe(3);
    expect(wrapper.vm.absentCount).toBe(0);
  });

  it('calls submitAttendance when submitting', async () => {
    const wrapper = initWrapper();
    await wrapper.vm.doSubmit();
    expect(mockSubmitAttendance).toHaveBeenCalledWith(
      'session-1',
      expect.arrayContaining([
        expect.objectContaining({ user: LEARNER_1.id, present: false }),
        expect.objectContaining({ user: LEARNER_2.id, present: false }),
        expect.objectContaining({ user: LEARNER_3.id, present: false }),
      ]),
    );
  });

  it('shows snackbar after successful submission', async () => {
    const wrapper = initWrapper();
    await wrapper.vm.doSubmit();
    expect(mockCreateSnackbar).toHaveBeenCalledWith('Attendance saved');
  });
});
