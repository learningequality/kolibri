import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { ref } from 'vue';
import IdCardsPage from '../idCards/IdCardsPage.vue';

/*
 * IdCardsPage.spec.js — placed in views/__tests__/ (not idCards/__tests__/)
 * so that jest.mock('../FacilityAppBarPage') resolves correctly.
 *
 * The test verifies the component's API data-loading contract.
 * Full DOM rendering is covered by sub-component tests
 * (StudentIdCard: 10, PrintableIdCards: 7) and manual browser testing.
 */

jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,FAKE_QR'),
}));
jest.mock('kolibri-common/apiResources/FacilityUserResource', () => ({
  __esModule: true,
  default: {
    fetchCollection: jest.fn(),
    saveModel: jest.fn(),
    rotateQrToken: jest.fn(),
    assignQrTokens: jest.fn(),
  },
}));
jest.mock('kolibri-common/apiResources/FacilityDatasetResource', () => ({
  __esModule: true,
  default: { saveModel: jest.fn() },
}));
jest.mock('kolibri-common/composables/useFacility');
jest.mock('kolibri/composables/useSnackbar');
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow');
jest.mock('kolibri-common/composables/useTaskPolling', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('kolibri-common/utils/syncTaskUtils', () => ({
  __esModule: true,
  TaskStatuses: { COMPLETED: 'COMPLETED', FAILED: 'FAILED' },
}));
jest.mock('../FacilityAppBarPage', () => ({
  name: 'FacilityAppBarPage',
  render(h) {
    return h('div', { class: 'facility-stub' }, this.$slots.default);
  },
}));
jest.mock('kolibri-common/components/StudentIdCard', () => ({
  __esModule: true,
  default: {
    name: 'StudentIdCard',
    props: ['learner'],
    render: h => h('div', { class: 'card-stub' }),
  },
}));
jest.mock('kolibri-common/components/PrintableIdCards', () => ({
  __esModule: true,
  default: { name: 'PrintableIdCards', render: h => h('div') },
}));
jest.mock('kolibri-design-system/lib/buttons-and-links/KButton', () => ({
  __esModule: true,
  default: {
    name: 'KButton',
    props: ['text', 'disabled'],
    render(h) {
      return h(
        'button',
        {
          class: 'k-btn-stub',
          attrs: { disabled: this.disabled },
          on: { click: () => this.$emit('click') },
        },
        this.text,
      );
    },
  },
}));
jest.mock('kolibri-design-system/lib/KTextbox', () => ({
  __esModule: true,
  default: { name: 'KTextbox', render: h => h('input') },
}));
jest.mock('kolibri-design-system/lib/grids/KGrid', () => ({
  __esModule: true,
  default: {
    name: 'KGrid',
    render(h) {
      return h('div', this.$slots.default);
    },
  },
}));
jest.mock('kolibri-design-system/lib/grids/KGridItem', () => ({
  __esModule: true,
  default: {
    name: 'KGridItem',
    render(h) {
      return h('div', this.$slots.default);
    },
  },
}));
jest.mock('kolibri-design-system/lib/KPageContainer', () => ({
  __esModule: true,
  default: {
    name: 'KPageContainer',
    render(h) {
      return h('div', this.$slots.default);
    },
  },
}));
jest.mock('kolibri-design-system/lib/loaders/KCircularLoader', () => ({
  __esModule: true,
  default: { name: 'KCircularLoader', render: h => h('div') },
}));

const FacilityUserResource = require('kolibri-common/apiResources/FacilityUserResource').default;

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

// Shared across tests so each test can drive the task-polling ref; reassigned
// by setupMocks() on every beforeEach.
let sharedTasksRef;
let sharedCreateSnackbar;

function setupMocks() {
  const useFacility = require('kolibri-common/composables/useFacility').default;
  useFacility.mockReturnValue({
    facilityId: ref('fac1'),
    facilityConfig: ref({ id: 'ds1', description: 'Test', extra_fields: {} }),
    currentFacilityName: ref('Test'),
    fetchFacilityConfig: jest.fn(),
  });
  const useSnackbar = require('kolibri/composables/useSnackbar').default;
  sharedCreateSnackbar = jest.fn();
  useSnackbar.mockReturnValue({ createSnackbar: sharedCreateSnackbar });
  require('kolibri-design-system/lib/composables/useKResponsiveWindow').default.mockReturnValue({
    windowBreakpoint: ref(6),
  });
  const tasksRef = ref([]);
  sharedTasksRef = tasksRef;
  const useTaskPolling = require('kolibri-common/composables/useTaskPolling').default;
  useTaskPolling.mockReturnValue({ tasks: tasksRef });
  FacilityUserResource.fetchCollection.mockResolvedValue([]);
}

describe('IdCardsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  it('calls fetchCollection with learner filter on mount', async () => {
    render(IdCardsPage);
    await flushPromises();
    expect(FacilityUserResource.fetchCollection).toHaveBeenCalled();
    const args = FacilityUserResource.fetchCollection.mock.calls[0][0];
    expect(args.getParams).toEqual({ member_of: 'fac1', user_type: 'learner' });
  });

  it('disables the Generate button when every learner already has a QR token', async () => {
    FacilityUserResource.fetchCollection.mockResolvedValue([
      { id: 'u1', full_name: 'A', username: 'a', qr_login_token: 'has-token' },
    ]);
    render(IdCardsPage);
    await flushPromises();

    const generateBtn = screen.getByText('Generate QR codes').closest('button');
    expect(generateBtn).toBeDisabled();
  });

  it('bulk-assigns tokens for learners missing one and refetches on completion', async () => {
    FacilityUserResource.fetchCollection.mockResolvedValue([
      { id: 'u1', full_name: 'Has Token', username: 'has', qr_login_token: 'tok' },
      { id: 'u2', full_name: 'No Token', username: 'no', qr_login_token: null },
    ]);
    FacilityUserResource.assignQrTokens.mockResolvedValue({
      data: { task: { id: 'task-1' } },
    });

    render(IdCardsPage);
    await flushPromises();
    expect(FacilityUserResource.fetchCollection).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByText('Generate QR codes'));

    // Only the learner without a token is sent; the one with a token is skipped.
    expect(FacilityUserResource.assignQrTokens).toHaveBeenCalledWith(['u2']);

    // Simulate the background task reporting completion; the watch should refetch.
    sharedTasksRef.value = [{ id: 'task-1', status: 'COMPLETED' }];
    await flushPromises();

    expect(FacilityUserResource.fetchCollection).toHaveBeenCalledTimes(2);
    expect(sharedCreateSnackbar).toHaveBeenCalled();
  });

  it('shows a snackbar and does not refetch when the task fails', async () => {
    FacilityUserResource.fetchCollection.mockResolvedValue([
      { id: 'u2', full_name: 'No Token', username: 'no', qr_login_token: null },
    ]);
    FacilityUserResource.assignQrTokens.mockResolvedValue({
      data: { task: { id: 'task-2' } },
    });

    render(IdCardsPage);
    await flushPromises();

    await userEvent.click(screen.getByText('Generate QR codes'));

    sharedTasksRef.value = [{ id: 'task-2', status: 'FAILED' }];
    await flushPromises();

    // No refetch on failure.
    expect(FacilityUserResource.fetchCollection).toHaveBeenCalledTimes(1);
    expect(sharedCreateSnackbar).toHaveBeenCalled();
  });
});
