import { render, screen } from '@testing-library/vue';
import '@testing-library/jest-dom';
import { ref } from 'vue';
import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
import useFacilities, { useFacilitiesMock } from 'kolibri-common/composables/useFacilities'; // eslint-disable-line
import useFacility, { useFacilityMock } from 'kolibri-common/composables/useFacility'; // eslint-disable-line
import FacilityAppBarPage from '../FacilityAppBarPage';

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
    renderPage({ appBarTitle: 'Facility settings' });
    expect(screen.getByRole('heading', { name: 'Facility settings' })).toBeInTheDocument();
  });

  it('shows the current facility name for multi-facility admins', () => {
    useFacilities.mockReturnValue(useFacilitiesMock({ userIsMultiFacilityAdmin: ref(true) }));
    useFacility.mockReturnValue(useFacilityMock({ currentFacilityName: ref('Sunrise School') }));
    renderPage();

    expect(screen.getByRole('heading', { name: 'Facility – Sunrise School' })).toBeInTheDocument();
  });

  it('shows the default facility title for single-facility admins', () => {
    useFacilities.mockReturnValue(useFacilitiesMock({ userIsMultiFacilityAdmin: ref(false) }));
    useFacility.mockReturnValue(useFacilityMock({ currentFacilityName: ref('') }));
    renderPage();

    expect(screen.getByRole('heading', { name: 'Facility' })).toBeInTheDocument();
  });
});
