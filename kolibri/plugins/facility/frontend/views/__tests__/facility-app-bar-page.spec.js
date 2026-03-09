import { render, screen } from '@testing-library/vue';
import '@testing-library/jest-dom';
import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line
import useFacilities, { useFacilitiesMock } from 'kolibri-common/composables/useFacilities'; // eslint-disable-line
import FacilityAppBarPage from '../FacilityAppBarPage';

jest.mock('kolibri/urls');
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow');
jest.mock('kolibri/composables/useUser');
jest.mock('kolibri-common/composables/useFacilities');

const renderComponent = (props = {}) => {
  return render(FacilityAppBarPage, {
    props,
    store: {
      getters: {
        isPageLoading: () => false,
      },
    },
  });
};

describe('FacilityAppBarPage', function () {
  beforeAll(() => {
    useKResponsiveWindow.mockImplementation(() => ({
      windowIsSmall: false,
    }));
  });
  beforeEach(() => {
    useUser.mockImplementation(() => useUserMock());
    useFacilities.mockImplementation(() => useFacilitiesMock());
  });

  it('smoke test', () => {
    renderComponent();
    // The component renders an AppBarPage which contains a header element
    expect(screen.getByText('Facility')).toBeInTheDocument();
  });

  describe('the title', () => {
    it('should display the value of appBarTitle prop when provided', () => {
      const appBarTitle = 'Custom Title';
      renderComponent({ appBarTitle });
      expect(screen.getByText(appBarTitle)).toBeInTheDocument();
    });

    describe('when the user is an admin of multiple facilities, and a current facility name is defined', () => {
      it("should display 'Facility – ' with the current facility name", () => {
        useFacilities.mockImplementation(() =>
          useFacilitiesMock({
            userIsMultiFacilityAdmin: true,
            currentFacilityName: 'currentFacilityName',
          }),
        );
        renderComponent({ appBarTitle: null });
        expect(screen.getByText('Facility – currentFacilityName')).toBeInTheDocument();
      });
    });
  });

  describe('when the user is not an admin of multiple facilities', () => {
    it("should display 'Facility' as the title", () => {
      useUser.mockImplementation(() =>
        useUserMock({
          userIsMultiFacilityAdmin: false,
          currentFacilityName: 'currentFacilityName',
        }),
      );
      renderComponent();
      expect(screen.getByText('Facility')).toBeInTheDocument();
    });
  });
});
