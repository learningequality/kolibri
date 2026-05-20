import { render, screen } from '@testing-library/vue';
import '@testing-library/jest-dom';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line import-x/named
import { picturePasswordStrings } from 'kolibri-common/strings/picturePasswords';
import makeStore from '../../../__tests__/utils/makeStore';
import LearnersRootPage from '../LearnersRootPage.vue';

const { viewPasswordsAction$ } = picturePasswordStrings;

jest.mock('kolibri-common/composables/usePageLoading');
jest.mock('kolibri/composables/useUser');
jest.mock('../../../composables/fetchClassSyncStatus');
jest.mock('kolibri/urls');
jest.mock('kolibri/router', () => ({
  getRoute: jest.fn((name, params) => ({ name, params })),
  getReactiveRoute: jest.fn(() => ({ params: {} })),
}));

const routes = [
  { path: '/test', name: 'test' },
  { path: '/passwords', name: 'LEARNER_PASSWORDS' },
  { path: '/learner', name: 'LEARNER_SUMMARY' },
];

const MOCK_LEARNER = { id: 'learner-1', name: 'Learner One', username: 'learner1' };

function renderComponent({ picturePasswordSettings, learners = [] } = {}) {
  const store = makeStore();
  const learnerMap = {};
  learners.forEach(l => {
    learnerMap[l.id] = l;
  });
  store.state.classSummary.learnerMap = learnerMap;
  store.state.classSummary.picture_password_settings = picturePasswordSettings;
  return render(LearnersRootPage, { store, routes });
}

describe('LearnersRootPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useUser.mockImplementation(() => useUserMock({ isCoach: true }));
  });

  describe('"View Passwords" button conditional rendering', () => {
    it('does not render when picture_password_settings is null', () => {
      renderComponent({ picturePasswordSettings: null, learners: [MOCK_LEARNER] });
      expect(screen.queryByRole('link', { name: viewPasswordsAction$() })).not.toBeInTheDocument();
    });

    it('does not render when picture_password_settings is undefined', () => {
      renderComponent({ picturePasswordSettings: undefined, learners: [MOCK_LEARNER] });
      expect(screen.queryByRole('link', { name: viewPasswordsAction$() })).not.toBeInTheDocument();
    });

    it('does not render when picture_password_settings is set but class has no learners', () => {
      renderComponent({ picturePasswordSettings: { enabled: true }, learners: [] });
      expect(screen.queryByRole('link', { name: viewPasswordsAction$() })).not.toBeInTheDocument();
    });

    it('renders when picture_password_settings is set and class has learners', () => {
      renderComponent({ picturePasswordSettings: { enabled: true }, learners: [MOCK_LEARNER] });
      expect(screen.getByRole('link', { name: viewPasswordsAction$() })).toBeInTheDocument();
    });
  });
});
