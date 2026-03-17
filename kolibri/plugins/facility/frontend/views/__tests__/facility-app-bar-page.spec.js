import { render, screen } from '@testing-library/vue';
import '@testing-library/jest-dom';
import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
import useFacilities, { useFacilitiesMock } from 'kolibri-common/composables/useFacilities'; // eslint-disable-line
import FacilityAppBarPage from '../FacilityAppBarPage';

jest.mock('kolibri/urls');
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow');
jest.mock('kolibri-common/composables/useFacilities');
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
    useFacilities.mockImplementation(() => useFacilitiesMock());
  });
  beforeEach(() => {
    useKResponsiveWindow.mockImplementation(() => ({
      windowIsSmall: false,
    }));
  });

  it('shows the page title passed by the parent page', () => {
    renderPage({ appBarTitle: 'Facility settings' });
    expect(screen.getByRole('heading', { name: 'Facility settings' })).toBeInTheDocument();
  });

  it('shows the current facility name for multi-facility admins', () => {
    useFacilities.mockImplementation(() =>
      useFacilitiesMock({
        userIsMultiFacilityAdmin: true,
        currentFacilityName: 'Sunrise School',
      }),
    );
    renderPage();

    expect(screen.getByRole('heading', { name: 'Facility – Sunrise School' })).toBeInTheDocument();
  });

  it('shows the default facility title for single-facility admins', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Facility' })).toBeInTheDocument();
  });
});
