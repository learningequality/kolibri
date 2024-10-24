import FacilityResource from 'kolibri-common/apiResources/FacilityResource';
import FacilityDatasetResource from 'kolibri-common/apiResources/FacilityDatasetResource';
import client from 'kolibri/client';
import { showFacilityConfigPage } from '../../src/modules/facilityConfig/handlers';
import makeStore from '../makeStore';
import coreModule from '../../../../../core/assets/src/state/modules/core';

jest.mock('kolibri/client');
jest.mock('kolibri/urls');
jest.mock('kolibri-common/apiResources/FacilityResource');
jest.mock('kolibri-common/apiResources/FacilityDatasetResource');

const fakeFacility = {
  name: 'Nalanda Maths',
};

const fakeFacilities = [fakeFacility];
const fakeDatasets = [
  {
    id: 'dataset_2',
    learner_can_edit_name: true,
    learner_can_edit_username: false,
    learner_can_edit_password: true,
    learner_can_delete_account: true,
    learner_can_sign_up: true,
  },
  // could return more than one dataset in theory
  { id: 'dataset_3' },
];

const testCases = [
  {
    description:
      'single facility user with session.facility_id and no facility_id in toRoute params',
    userIsMultiFacilityAdmin: false,
    toRoute: {
      params: {
        facility_id: '',
      },
    },
    expectedResult: '1',
  },
  {
    description: 'single facility user with facility_id in toRoute params',
    userIsMultiFacilityAdmin: false,
    toRoute: {
      params: {
        facility_id: '2',
      },
    },
    expectedResult: '2',
  },
  {
    description: 'multi-facility user with facility_id in toRoute params',
    userIsMultiFacilityAdmin: true,
    toRoute: {
      params: {
        facility_id: '3',
      },
    },
    expectedResult: '3',
  },
];

describe('facility config page actions', () => {
  let store;
  let commitStub;

  beforeEach(() => {
    store = makeStore();
    store.registerModule('core', coreModule);
    commitStub = jest.spyOn(store, 'commit');
    store.state.route = { params: {} };
    Object.assign(store.state.core, {
      pageId: '123',
      session: {
        userFacilityId: '1',
      },
    });
  });

  afterEach(() => {
    FacilityResource.fetchModel.mockReset();
    FacilityResource.fetchCollection.mockReset();
    FacilityDatasetResource.fetchCollection.mockReset();
    FacilityDatasetResource.saveModel.mockReset();
  });

  describe('showFacilityConfigPage action', () => {
    testCases.forEach(test => {
      beforeEach(() => {
        const mockUserIsMultiFacilityAdmin = jest
          .fn()
          .mockReturnValueOnce(test.userIsMultiFacilityAdmin);

        const mockActiveFacilityId = jest
          .fn()
          .mockReturnValueOnce(store.state.core.session.userFacilityId);

        store.getters = {
          userIsMultiFacilityAdmin: mockUserIsMultiFacilityAdmin(),
          activeFacilityId: mockActiveFacilityId(),
        };
      });

      it(`should load resources successfully for ${test.description}`, () => {
        FacilityResource.fetchModel.mockResolvedValue(fakeFacility);
        FacilityResource.fetchCollection.mockResolvedValue(fakeFacilities);
        FacilityDatasetResource.fetchCollection.mockResolvedValue(fakeDatasets);
        const expectedState = {
          facilityDatasetId: 'dataset_2',
          facilityName: 'Nalanda Maths',
          settings: expect.objectContaining({
            learner_can_edit_name: true,
            learner_can_edit_username: false,
            learner_can_edit_password: true,
            learner_can_delete_account: true,
            learner_can_sign_up: true,
          }),
          settingsCopy: expect.objectContaining({
            learner_can_edit_name: true,
            learner_can_edit_username: false,
            learner_can_edit_password: true,
            learner_can_delete_account: true,
            learner_can_sign_up: true,
          }),
        };

        return showFacilityConfigPage(store, test.toRoute).then(() => {
          expect(FacilityDatasetResource.fetchCollection).toHaveBeenCalledWith({
            getParams: { facility_id: test.expectedResult },
          });
          expect(commitStub).toHaveBeenCalledWith(
            'facilityConfig/SET_STATE',
            expect.objectContaining(expectedState),
          );
        });
      });

      describe(`error handling for ${test.description}`, () => {
        const expectedState = {
          facilityName: '',
          settings: null,
        };
        it('when fetching Facility fails', () => {
          FacilityResource.fetchModel.mockRejectedValue('incomprehensible error');
          FacilityResource.fetchCollection.mockResolvedValue(fakeFacilities);
          FacilityDatasetResource.fetchCollection.mockResolvedValue(fakeDatasets);
          return showFacilityConfigPage(store, test.toRoute).then(() => {
            expect(commitStub).toHaveBeenCalledWith(
              'facilityConfig/SET_STATE',
              expect.objectContaining(expectedState),
            );
          });
        });

        it('when fetching FacilityDataset fails', async () => {
          FacilityResource.fetchModel.mockResolvedValue(fakeFacility);
          FacilityResource.fetchCollection.mockResolvedValue(fakeFacilities);
          FacilityDatasetResource.fetchCollection.mockRejectedValue('incoprehensible error');
          await showFacilityConfigPage(store, test.toRoute);
          expect(commitStub).toHaveBeenCalledWith(
            'facilityConfig/SET_STATE',
            expect.objectContaining(expectedState),
          );
        });
      });
    });
  });

  describe('saveFacilityConfig action', () => {
    beforeEach(() => {
      store.commit('facilityConfig/SET_STATE', {
        facilityDatasetId: 1000,
        settings: {
          learner_can_edit_name: true,
          learner_can_edit_username: false,
          learner_can_edit_password: true,
          learner_can_delete_account: true,
          learner_can_sign_up: false,
        },
      });
    });

    testCases.forEach(test => {
      it(`should successfully save for ${test.description}`, () => {
        const expectedRequest = {
          learner_can_edit_name: true,
          learner_can_edit_username: false,
          learner_can_edit_password: true,
          learner_can_delete_account: true,
          learner_can_sign_up: false,
        };
        // IRL returns the updated Model
        const saveStub = FacilityDatasetResource.saveModel.mockResolvedValue('ok');

        return store.dispatch('facilityConfig/saveFacilityConfig').then(() => {
          expect(saveStub).toHaveBeenCalledWith(
            expect.objectContaining({ id: 1000, data: expectedRequest }),
          );
        });
      });

      it(`when save fails for ${test.description}`, () => {
        const saveStub = FacilityDatasetResource.saveModel.mockRejectedValue('heck no', true);
        return store.dispatch('facilityConfig/saveFacilityConfig').catch(() => {
          expect(saveStub).toHaveBeenCalled();
          expect(store.state.facilityConfig.settings).toEqual({
            learner_can_edit_name: true,
            learner_can_edit_username: false,
            learner_can_edit_password: true,
            learner_can_delete_account: true,
            learner_can_sign_up: false,
          });
        });
      });

      it(`resetFacilityConfig action dispatches resets settings and makes a save request for ${test.description}`, () => {
        const expected = {
          learner_can_edit_username: true,
          learner_can_edit_name: false,
          learner_can_edit_password: true,
          learner_can_sign_up: false,
          learner_can_delete_account: true,
          learner_can_login_with_no_password: false,
          show_download_button_in_learn: true,
        };
        client.mockResolvedValue({ data: expected });
        return store.dispatch('facilityConfig/resetFacilityConfig').then(() => {
          expect(store.state.facilityConfig.settings).toEqual(expected);
        });
      });
    });
  });
});
