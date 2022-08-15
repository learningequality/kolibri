import { mount } from '@vue/test-utils';
import Vuex from 'vuex';
import FacilityAppBarPage from '../../src/views/FacilityAppBarPage';

function makeWrapper({ propsData = {}, vuexData = {} }) {
  const store = new Vuex.Store(vuexData);
  store.getters = {
    facilityPageLinks: () => {},
    getUserKind: jest.fn(),
  };
  store.state.core = {
    loading: false,
    ...store.state.core,
  };
  return mount(FacilityAppBarPage, {
    propsData,
    store,
    stubs: ['FacilityTopNav'],
  });
}

describe('FacilityAppBarPage', function() {
  it('renders the FacilityTopNav component', () => {
    const wrapper = makeWrapper({});
    expect(wrapper.findComponent({ name: 'FacilityTopNav' }).exists()).toBe(true);
  });
  describe('the title computed property', () => {
    it('should return the value of appBarTitle prop when provided', () => {
      const appBarTitle = 'appBarTitle';
      const wrapper = makeWrapper({ propsData: { appBarTitle } });
      expect(wrapper.vm.title).toBe(appBarTitle);
    });
    describe('the user is an admin of multiple facilities, and a current facility name is defined', () => {
      it("should return the string 'Facility – ' with the current facility name", () => {
        const wrapper = makeWrapper({
          propsData: { appBarTitle: null },
          vuexData: {
            getters: {
              userIsMultiFacilityAdmin: jest.fn(() => true),
              currentFacilityName: jest.fn(() => 'currentFacilityName'),
            },
          },
        });
        const expectedTitle = 'Facility – currentFacilityName';
        expect(wrapper.vm.title).toBe(expectedTitle);
      });
    });
  });
  describe('the user is not an admin of multiple facilities', () => {
    it('should return the value of appBarTitle prop when provided', () => {
      const wrapper = makeWrapper({
        vuexData: {
          getters: {
            userIsMultiFacilityAdmin: jest.fn(() => false),
            currentFacilityName: jest.fn(() => 'currentFacilityName'),
          },
        },
      });
      expect(wrapper.vm.title).toBe('Facility');
    });
  });
});
