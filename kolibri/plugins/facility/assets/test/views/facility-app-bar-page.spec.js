import { mount } from '@vue/test-utils';
import { Store } from 'vuex';
import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line
import FacilityAppBarPage from '../../src/views/FacilityAppBarPage';

function makeWrapper({ propsData = {}, getters = {} }) {
  const store = new Store(getters);
  store.getters = {
    getUserKind: jest.fn(),
    ...getters,
  };
  return mount(FacilityAppBarPage, {
    propsData,
    store,
  });
}
jest.mock('kolibri/urls');
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow');
jest.mock('kolibri/composables/useUser');

describe('FacilityAppBarPage', function () {
  beforeEach(() => {
    useUser.mockImplementation(() => useUserMock());
  });
  beforeAll(() => {
    useKResponsiveWindow.mockImplementation(() => ({
      windowIsSmall: false,
    }));
  });
  it('renders the AppBar component', () => {
    const wrapper = makeWrapper({});
    expect(wrapper.findComponent({ name: 'AppBar' }).exists()).toBe(true);
  });
  describe('the title computed property', () => {
    it('should return the value of appBarTitle prop when provided', () => {
      const appBarTitle = 'appBarTitle';
      const wrapper = makeWrapper({ propsData: { appBarTitle } });
      expect(wrapper.vm.title).toBe(appBarTitle);
    });
    describe('the user is an admin of multiple facilities, and a current facility name is defined', () => {
      it("should return the string 'Facility – ' with the current facility name", () => {
        useUser.mockImplementation(() => useUserMock({ userIsMultiFacilityAdmin: true }));
        const wrapper = makeWrapper({
          propsData: { appBarTitle: null },
          getters: {
            currentFacilityName: 'currentFacilityName',
          },
        });
        const expectedTitle = 'Facility – currentFacilityName';
        expect(wrapper.vm.title).toBe(expectedTitle);
      });
    });
  });
  describe('the user is not an admin of multiple facilities', () => {
    it('should return the value of appBarTitle prop when provided', () => {
      useUser.mockImplementation(() => useUserMock({ userIsMultiFacilityAdmin: false }));
      const wrapper = makeWrapper({
        getters: {
          currentFacilityName: 'currentFacilityName',
        },
      });
      expect(wrapper.vm.title).toBe('Facility');
    });
  });
});
