import { render, screen } from '@testing-library/vue';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line import-x/named
import { syncStrings } from 'kolibri-common/mixins/commonSyncElements';
import SelectFacility from '../SelectFacility';

jest.mock('kolibri/composables/useUser');
jest.mock('kolibri-common/components/syncComponentSet/SelectDeviceModalGroup/useDevices', () => ({
  __esModule: true,
  default: () => {
    const { ref } = require('vue');
    return {
      devices: ref([]),
      isFetching: ref(false),
      hasFetched: ref(true),
      fetchFailed: ref(false),
      forceFetch: jest.fn(),
    };
  },
}));

function renderComponent() {
  return render(SelectFacility, {
    provide: {
      changeFacilityService: { send: jest.fn() },
    },
  });
}

function queryAddAddressButton() {
  return screen.queryByText(syncStrings.$tr('addNewAddressAction'));
}

describe('ChangeFacility/SelectFacility', () => {
  it('hides the add address option from learners', () => {
    useUser.mockImplementation(() => useUserMock({ isLearner: true }));
    renderComponent();
    expect(queryAddAddressButton()).not.toBeInTheDocument();
  });

  it('shows the add address option to admins', () => {
    useUser.mockImplementation(() => useUserMock({ isAdmin: true }));
    renderComponent();
    expect(queryAddAddressButton()).toBeInTheDocument();
  });

  it('shows the add address option to content managers', () => {
    useUser.mockImplementation(() => useUserMock({ canManageContent: true }));
    renderComponent();
    expect(queryAddAddressButton()).toBeInTheDocument();
  });
});
