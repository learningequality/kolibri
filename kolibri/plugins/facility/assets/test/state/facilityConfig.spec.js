import { FacilityResource, FacilityDatasetResource } from 'kolibri.resources';
import client from 'kolibri.client';
import { showFacilityConfigPage } from '../../src/modules/facilityConfig/handlers';
import makeStore from '../makeStore';

jest.mock('kolibri.client');
jest.mock('kolibri.urls');
jest.mock('kolibri.resources');

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

const toRoute = {
  params: {},
};

describe('facility config page actions', () => {
  let store;
  let commitStub;

  beforeEach(() => {
    store = makeStore();
    commitStub = jest.spyOn(store, 'commit');
    store.state.route = { params: {} };
    Object.assign(store.state.core, {
      pageId: '123',
      session: {
        facility_id: 1,
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
    it('when resources load successfully', () => {
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

      return showFacilityConfigPage(store, toRoute).then(() => {
        expect(FacilityDatasetResource.fetchCollection).toHaveBeenCalledWith({
          getParams: { facility_id: 1 },
        });
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
      };
      it('when fetching Facility fails', () => {
        FacilityResource.fetchModel.mockRejectedValue('incomprehensible error');
        FacilityResource.fetchCollection.mockResolvedValue(fakeFacilities);
        FacilityDatasetResource.fetchCollection.mockResolvedValue(fakeDatasets);
        return showFacilityConfigPage(store, toRoute).then(() => {
          expect(commitStub).toHaveBeenCalledWith(
            'facilityConfig/SET_STATE',
            expect.objectContaining(expectedState)
          );
        });
      });

      it('when fetching FacilityDataset fails', async () => {
        FacilityResource.fetchModel.mockResolvedValue(fakeFacility);
        FacilityResource.fetchCollection.mockResolvedValue(fakeFacilities);
        FacilityDatasetResource.fetchCollection.mockRejectedValue('incoprehensible error');
        await showFacilityConfigPage(store, toRoute);
        expect(commitStub).toHaveBeenCalledWith(
          'facilityConfig/SET_STATE',
          expect.objectContaining(expectedState)
        );
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
      const saveStub = FacilityDatasetResource.saveModel.mockResolvedValue('ok');

      return store.dispatch('facilityConfig/saveFacilityConfig').then(() => {
        expect(saveStub).toHaveBeenCalledWith(
          expect.objectContaining({ id: 1000, data: expectedRequest })
        );
      });
    });

    it('when save fails', () => {
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

    it('resetFacilityConfig action dispatches resets settings and makes a save request', () => {
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
