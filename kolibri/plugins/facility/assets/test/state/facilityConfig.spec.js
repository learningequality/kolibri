import { FacilityResource, FacilityDatasetResource } from 'kolibri.resources';
import { showFacilityConfigPage } from '../../src/modules/facilityConfig/handlers';
import { jestMockResource } from 'testUtils'; // eslint-disable-line
import makeStore from '../makeStore';

const FacilityStub = jestMockResource(FacilityResource);
const DatasetStub = jestMockResource(FacilityDatasetResource);

const fakeFacility = {
  name: 'Nalanda Maths',
};

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

describe('facility config page actions', () => {
  let store;
  let commitStub;

  beforeEach(() => {
    store = makeStore();
    commitStub = jest.spyOn(store, 'commit');
    Object.assign(store.state.core, {
      pageId: '123',
      session: {
        facility_id: 1,
      },
    });
    FacilityResource.__resetMocks();
    FacilityDatasetResource.__resetMocks();
  });

  describe('showFacilityConfigPage action', () => {
    it('when resources load successfully', () => {
      FacilityStub.__getModelFetchReturns(fakeFacility);
      DatasetStub.__getCollectionFetchReturns(fakeDatasets);
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

      return showFacilityConfigPage(store).then(() => {
        expect(DatasetStub.getCollection).toHaveBeenCalledWith({ facility_id: 1 });
        expect(commitStub).toHaveBeenCalledWith(
          'facilityConfig/SET_STATE',
          expect.objectContaining(expectedState)
        );
      });
    });

    describe('error handling', () => {
      const expectedState = {
        facilityName: '',
        settings: null,
        notification: 'PAGELOAD_FAILURE',
      };
      it('when fetching Facility fails', () => {
        FacilityStub.__getModelFetchReturns('incomprehensible error', true);
        DatasetStub.__getCollectionFetchReturns(fakeDatasets);
        return showFacilityConfigPage(store).then(() => {
          expect(commitStub).toHaveBeenCalledWith(
            'facilityConfig/SET_STATE',
            expect.objectContaining(expectedState)
          );
        });
      });

      it('when fetching FacilityDataset fails', () => {
        FacilityStub.__getModelFetchReturns(fakeFacility);
        DatasetStub.__getCollectionFetchReturns('incomprehensible error', true);
        return showFacilityConfigPage(store).then(() => {
          expect(commitStub).toHaveBeenCalledWith(
            'facilityConfig/SET_STATE',
            expect.objectContaining(expectedState)
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

    it('when save is successful', () => {
      const expectedRequest = {
        learner_can_edit_name: true,
        learner_can_edit_username: false,
        learner_can_edit_password: true,
        learner_can_delete_account: true,
        learner_can_sign_up: false,
      };
      // IRL returns the updated Model
      const saveStub = DatasetStub.__getModelSaveReturns('ok');

      return store.dispatch('facilityConfig/saveFacilityConfig').then(() => {
        expect(DatasetStub.getModel).toHaveBeenCalledWith(1000, {});
        expect(saveStub).toHaveBeenCalledWith(expect.objectContaining(expectedRequest), false);
        expect(store.state.facilityConfig.notification).toEqual('SAVE_SUCCESS');
      });
    });

    it('when save fails', () => {
      const saveStub = DatasetStub.__getModelSaveReturns('heck no', true);
      return store.dispatch('facilityConfig/saveFacilityConfig').then(() => {
        expect(saveStub).toHaveBeenCalled();
        expect(store.state.facilityConfig.notification).toEqual('SAVE_FAILURE');
        expect(store.state.facilityConfig.settings).toEqual({
          learner_can_edit_name: true,
          learner_can_edit_username: false,
          learner_can_edit_password: true,
          learner_can_delete_account: true,
          learner_can_sign_up: false,
        });
      });
    });

    it('resetFacilityConfig action dispatches resets settings and makes a save request', () => {
      const saveStub = DatasetStub.__getModelSaveReturns('ok default');
      return store.dispatch('facilityConfig/resetFacilityConfig').then(() => {
        expect(saveStub).toHaveBeenCalled();
        expect(store.state.facilityConfig.settings).toEqual({
          learner_can_edit_username: true,
          learner_can_edit_name: true,
          learner_can_edit_password: true,
          learner_can_sign_up: true,
          learner_can_delete_account: true,
          learner_can_login_with_no_password: false,
          show_download_button_in_learn: false,
        });
      });
    });
  });
});
