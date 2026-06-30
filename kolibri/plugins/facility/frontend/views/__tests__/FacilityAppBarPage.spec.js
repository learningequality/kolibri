import { render, screen } from '@testing-library/vue';
import '@testing-library/jest-dom';
import { ref } from 'vue';
import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
import useFacilities, { useFacilitiesMock } from 'kolibri-common/composables/useFacilities'; // eslint-disable-line
import useFacility, { useFacilityMock } from 'kolibri-common/composables/useFacility'; // eslint-disable-line
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import FacilityAppBarPage from '../FacilityAppBarPage';

const { facilityLabel$ } = coreStrings;

const APP_BAR_TITLE = 'Facility settings';
const FACILITY_NAME = 'Sunrise School';

jest.mock('kolibri/urls');
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow');
jest.mock('kolibri-common/composables/useFacilities');
jest.mock('kolibri-common/composables/useFacility');
jest.mock('kolibri/components/pages/AppBarPage', () => ({
  name: 'AppBarPage',
  props: {
    title: {
      type: String,
      required: true,
    },
  },
  render(h) {
    return h('div', [
      h('h1', this.title),
      this.$scopedSlots.default ? this.$scopedSlots.default({ pageContentHeight: 600 }) : null,
    ]);
  },
}));

function renderPage(props = {}) {
  return render(FacilityAppBarPage, { props });
}

describe('FacilityAppBarPage', function () {
  beforeEach(() => {
    useKResponsiveWindow.mockImplementation(() => ({
      windowIsSmall: false,
    }));
  });

  it('shows the page title passed by the parent page', () => {
    useFacilities.mockReturnValue(useFacilitiesMock({ userIsMultiFacilityAdmin: ref(false) }));
    useFacility.mockReturnValue(useFacilityMock({ currentFacilityName: ref('') }));
    renderPage({ appBarTitle: APP_BAR_TITLE });
    expect(screen.getByRole('heading', { name: APP_BAR_TITLE })).toBeInTheDocument();
  });

  it('shows the current facility name for multi-facility admins', () => {
    useFacilities.mockReturnValue(useFacilitiesMock({ userIsMultiFacilityAdmin: ref(true) }));
    useFacility.mockReturnValue(useFacilityMock({ currentFacilityName: ref(FACILITY_NAME) }));
    renderPage();

    const expectedHeading = `${facilityLabel$()} – ${FACILITY_NAME}`;
    expect(screen.getByRole('heading', { name: expectedHeading })).toBeInTheDocument();
  });

  it('shows the default facility title for single-facility admins', () => {
    useFacilities.mockReturnValue(useFacilitiesMock({ userIsMultiFacilityAdmin: ref(false) }));
    useFacility.mockReturnValue(useFacilityMock({ currentFacilityName: ref('') }));
    renderPage();

    expect(screen.getByRole('heading', { name: facilityLabel$() })).toBeInTheDocument();
  });
});
