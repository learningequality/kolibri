/* eslint-env mocha */
import { FacilityResource, FacilityDatasetResource } from 'kolibri.resources';
import sinon from 'sinon';
import * as actions from '../../src/state/actions/facilityConfig';
import { mockResource } from 'testUtils'; // eslint-disable-line

const FacilityStub = mockResource(FacilityResource);
const DatasetStub = mockResource(FacilityDatasetResource);

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
  const storeMock = {
    dispatch: sinon.spy(),
    state: {
      core: {
        pageId: '123',
        session: {
          facility_id: 1,
        },
      },
    },
  };

  const dispatchStub = storeMock.dispatch;

  beforeEach(() => {
    FacilityResource.__resetMocks();
    FacilityDatasetResource.__resetMocks();
    dispatchStub.resetHistory();
    storeMock.state.pageState = {};
  });

  describe('showFacilityConfigPage action', () => {
    it('when resources load successfully', () => {
      FacilityStub.__getModelFetchReturns(fakeFacility);
      DatasetStub.__getCollectionFetchReturns(fakeDatasets);
      const expectedPageState = {
        facilityDatasetId: 'dataset_2',
        facilityName: 'Nalanda Maths',
        settings: {
          learnerCanEditName: true,
          learnerCanEditUsername: false,
          learnerCanEditPassword: true,
          learnerCanDeleteAccount: true,
          learnerCanSignUp: true,
        },
        settingsCopy: {
          learnerCanEditName: true,
          learnerCanEditUsername: false,
          learnerCanEditPassword: true,
          learnerCanDeleteAccount: true,
          learnerCanSignUp: true,
        },
      };

      return actions.showFacilityConfigPage(storeMock).then(() => {
        sinon.assert.calledWith(DatasetStub.getCollection, { facility_id: 1 });
        sinon.assert.calledWith(dispatchStub, 'SET_PAGE_STATE', sinon.match(expectedPageState));
      });
    });

    describe('error handling', () => {
      const expectedPageState = {
        facilityName: '',
        settings: null,
        notification: 'PAGELOAD_FAILURE',
      };
      it('when fetching Facility fails', () => {
        FacilityStub.__getModelFetchReturns('incomprehensible error', true);
        DatasetStub.__getCollectionFetchReturns(fakeDatasets);
        return actions.showFacilityConfigPage(storeMock).then(() => {
          sinon.assert.calledWith(dispatchStub, 'SET_PAGE_STATE', sinon.match(expectedPageState));
        });
      });

      it('when fetching FacilityDataset fails', () => {
        FacilityStub.__getModelFetchReturns(fakeFacility);
        DatasetStub.__getCollectionFetchReturns('incomprehensible error', true);
        return actions.showFacilityConfigPage(storeMock).then(() => {
          sinon.assert.calledWith(dispatchStub, 'SET_PAGE_STATE', sinon.match(expectedPageState));
        });
      });
    });
  });

  describe('saveFacilityConfig action', () => {
    beforeEach(() => {
      storeMock.state.pageState = {
        facilityDatasetId: 1000,
        settings: {
          learnerCanEditName: true,
          learnerCanEditUsername: false,
          learnerCanEditPassword: true,
          learnerCanDeleteAccount: true,
          learnerCanSignUp: false,
        },
      };
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

      return actions.saveFacilityConfig(storeMock).then(() => {
        sinon.assert.calledWith(DatasetStub.getModel, 1000);
        sinon.assert.calledWith(saveStub, sinon.match(expectedRequest));
        sinon.assert.calledWith(storeMock.dispatch, 'CONFIG_PAGE_NOTIFY', 'SAVE_SUCCESS');
      });
    });

    it('when save fails', () => {
      const saveStub = DatasetStub.__getModelSaveReturns('heck no', true);
      return actions.saveFacilityConfig(storeMock).then(() => {
        sinon.assert.called(saveStub);
        sinon.assert.calledWith(storeMock.dispatch, 'CONFIG_PAGE_NOTIFY', 'SAVE_FAILURE');
        sinon.assert.calledWith(storeMock.dispatch, 'CONFIG_PAGE_UNDO_SETTINGS_CHANGE');
      });
    });

    it('resetFacilityConfig action dispatches a modify all settings action before saving', () => {
      const saveStub = DatasetStub.__getModelSaveReturns('ok default');
      return actions.resetFacilityConfig(storeMock).then(() => {
        sinon.assert.calledWith(dispatchStub, 'CONFIG_PAGE_MODIFY_ALL_SETTINGS');
        sinon.assert.called(saveStub);
      });
    });
  });
});
