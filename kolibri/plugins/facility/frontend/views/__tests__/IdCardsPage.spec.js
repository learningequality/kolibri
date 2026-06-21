import { render } from '@testing-library/vue';
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

jest.mock('qrcode', () => ({ toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,FAKE_QR') }));
jest.mock('kolibri-common/apiResources/FacilityUserResource', () => ({
  __esModule: true,
  default: { fetchCollection: jest.fn(), saveModel: jest.fn(), rotateQrToken: jest.fn() },
}));
jest.mock('kolibri-common/apiResources/FacilityDatasetResource', () => ({
  __esModule: true,
  default: { saveModel: jest.fn() },
}));
jest.mock('kolibri-common/composables/useFacility');
jest.mock('kolibri/composables/useSnackbar');
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow');
jest.mock('../FacilityAppBarPage', () => ({
  name: 'FacilityAppBarPage',
  template: '<div class="facility-stub"><slot /></div>',
}));
jest.mock('kolibri-common/components/StudentIdCard', () => ({
  __esModule: true,
  default: { name: 'StudentIdCard', props: ['learner'], template: '<div class="card-stub" />' },
}));
jest.mock('kolibri-common/components/PrintableIdCards', () => ({
  __esModule: true,
  default: { name: 'PrintableIdCards', template: '<div />' },
}));
jest.mock('kolibri-design-system/lib/buttons-and-links/KButton', () => ({
  __esModule: true,
  default: { name: 'KButton', props: ['text', 'disabled'], template: '<button class="k-btn-stub">{{ text }}</button>' },
}));
jest.mock('kolibri-design-system/lib/KTextbox', () => ({ __esModule: true, default: { name: 'KTextbox', template: '<input />' } }));
jest.mock('kolibri-design-system/lib/grids/KGrid', () => ({ __esModule: true, default: { name: 'KGrid', template: '<div><slot /></div>' } }));
jest.mock('kolibri-design-system/lib/grids/KGridItem', () => ({ __esModule: true, default: { name: 'KGridItem', template: '<div><slot /></div>' } }));
jest.mock('kolibri-design-system/lib/KPageContainer', () => ({ __esModule: true, default: { name: 'KPageContainer', template: '<div><slot /></div>' } }));
jest.mock('kolibri-design-system/lib/loaders/KCircularLoader', () => ({ __esModule: true, default: { name: 'KCircularLoader', template: '<div />' } }));

const FacilityUserResource = require('kolibri-common/apiResources/FacilityUserResource').default;

function setupMocks() {
  const useFacility = require('kolibri-common/composables/useFacility').default;
  useFacility.mockReturnValue({
    facilityId: ref('fac1'),
    facilityConfig: ref({ id: 'ds1', description: 'Test', extra_fields: {} }),
    currentFacilityName: ref('Test'),
    fetchFacilityConfig: jest.fn(),
  });
  require('kolibri/composables/useSnackbar').createSnackbar = jest.fn();
  require('kolibri-design-system/lib/composables/useKResponsiveWindow').default
    .mockReturnValue({ windowBreakpoint: ref(6) });
  FacilityUserResource.fetchCollection.mockResolvedValue([]);
}

describe('IdCardsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  it('calls fetchCollection with learner filter on mount', async () => {
    render(IdCardsPage);
    await new Promise(r => setTimeout(r, 100));
    expect(FacilityUserResource.fetchCollection).toHaveBeenCalled();
    const args = FacilityUserResource.fetchCollection.mock.calls[0][0];
    expect(args.getParams).toEqual({ member_of: 'fac1', user_type: 'learner' });
  });
});
