import { fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import '@testing-library/jest-dom';
import VueRouter from 'vue-router';
import { coreString } from 'kolibri/uiText/commonCoreStrings';
import ConnectionUrlsResource from 'kolibri-common/apiResources/ConnectionUrlsResource';
import { connectDevicesStrings } from 'kolibri-common/strings/connectDevicesStrings';
import { picturePasswordStrings } from 'kolibri-common/strings/picturePasswords';
import makeStore from '../../../../__tests__/utils/makeStore';
import OverviewBlock from '../OverviewBlock.vue';

const { viewPasswordsAction$ } = picturePasswordStrings;
const { title$ } = connectDevicesStrings;

jest.mock('kolibri-common/composables/useFacilities');
jest.mock('kolibri/composables/useUser');
jest.mock('../../../../composables/fetchClassSyncStatus');
jest.mock('qrcode', () => ({
  toDataURL: jest.fn(url => Promise.resolve(`data:${url}`)),
}));
jest.mock('kolibri-common/apiResources/ConnectionUrlsResource', () => {
  const resource = jest.requireActual('kolibri-common/apiResources/ConnectionUrlsResource').default;
  resource.list = jest.fn();
  return { __esModule: true, default: resource };
});
jest.mock('kolibri/router', () => ({
  getRoute: jest.fn((name, params) => ({ name, params })),
}));

VueRouter.prototype.getRoute = jest.fn((name, params = {}, query = {}) => ({
  name,
  params,
  query,
}));

// Include LEARNER_PASSWORDS so KRouterLink does not warn about an unknown route
// when picture_password_settings is non-null and the button is rendered.
const routes = [
  { path: '/test', name: 'test' },
  { path: '/passwords', name: 'LEARNER_PASSWORDS' },
  { path: '/class-list', name: 'CoachClassListPage' },
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
  return render(OverviewBlock, { store, routes });
}

describe('OverviewBlock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  describe('"Help learners get connected" action', () => {
    beforeEach(() => {
      ConnectionUrlsResource.list.mockResolvedValue([
        { url: 'http://192.168.1.5:8080/', is_local_hostname: false },
      ]);
    });

    it.each([null, { enabled: true }])(
      'renders when picture_password_settings is %p',
      picturePasswordSettings => {
        renderComponent({ picturePasswordSettings, learners: [MOCK_LEARNER] });
        expect(screen.getByRole('button', { name: title$() })).toBeInTheDocument();
      },
    );

    it('opens the connect devices dialog and closes it on cancel', async () => {
      renderComponent({ picturePasswordSettings: null });
      expect(screen.queryByRole('dialog', { name: title$() })).not.toBeInTheDocument();

      await fireEvent.click(screen.getByRole('button', { name: title$() }));
      const dialog = await screen.findByRole('dialog', { name: title$() });
      expect(dialog).toBeInTheDocument();

      await fireEvent.click(
        within(dialog).getByRole('button', { name: coreString('closeAction') }),
      );
      await waitFor(() =>
        expect(screen.queryByRole('dialog', { name: title$() })).not.toBeInTheDocument(),
      );
    });
  });
});
