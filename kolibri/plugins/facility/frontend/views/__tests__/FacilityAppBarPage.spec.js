import { render, screen } from '@testing-library/vue';
import '@testing-library/jest-dom';
import { nextTick, ref } from 'vue';
import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
import useFacilities, { useFacilitiesMock } from 'kolibri-common/composables/useFacilities'; // eslint-disable-line
import useFacility, { useFacilityMock } from 'kolibri-common/composables/useFacility'; // eslint-disable-line
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import FacilityAppBarPage from '../FacilityAppBarPage';

const { facilityLabel$ } = coreStrings;

const APP_BAR_TITLE = 'Facility settings';
const FACILITY_NAME = 'Sunrise School';
const APP_BAR_PAGE_CONTENT_HEIGHT = 600;
const BANNER_HEIGHT = 150;

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
      this.$scopedSlots.default
        ? this.$scopedSlots.default({ pageContentHeight: APP_BAR_PAGE_CONTENT_HEIGHT })
        : null,
    ]);
  },
}));

function renderPage(props = {}, scopedSlots = {}) {
  return render(FacilityAppBarPage, { props, scopedSlots });
}

describe('FacilityAppBarPage', function () {
  beforeEach(() => {
    useKResponsiveWindow.mockImplementation(() => ({
      windowIsSmall: ref(false),
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

  describe('when the notification banner resizes', () => {
    let resizeBanner;

    beforeEach(() => {
      global.ResizeObserver = class {
        constructor(callback) {
          resizeBanner = blockSize => callback([{ borderBoxSize: [{ blockSize, inlineSize: 0 }] }]);
        }
        observe() {}
        unobserve() {}
        disconnect() {}
      };
    });

    afterEach(() => {
      delete global.ResizeObserver;
    });

    async function renderWithResizedBanner() {
      useFacilities.mockReturnValue(useFacilitiesMock({ userIsMultiFacilityAdmin: ref(false) }));
      useFacility.mockReturnValue(useFacilityMock({ currentFacilityName: ref('') }));
      renderPage(
        {},
        {
          default: '<p data-testid="content-height">{{ props.pageContentHeight }}</p>',
        },
      );

      await nextTick();
      resizeBanner(BANNER_HEIGHT);
      await nextTick();
    }

    it('gives the page content only the height left below the banner', async () => {
      await renderWithResizedBanner();

      expect(screen.getByTestId('content-height')).toHaveTextContent(
        String(APP_BAR_PAGE_CONTENT_HEIGHT - BANNER_HEIGHT),
      );
    });

    it('gives the page content the full height on small windows, where the banner stacks', async () => {
      useKResponsiveWindow.mockImplementation(() => ({
        windowIsSmall: ref(true),
      }));
      await renderWithResizedBanner();

      expect(screen.getByTestId('content-height')).toHaveTextContent(
        String(APP_BAR_PAGE_CONTENT_HEIGHT),
      );
    });
  });
});
