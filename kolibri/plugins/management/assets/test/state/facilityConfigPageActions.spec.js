/* eslint-env mocha */
const kolibri = require('kolibri');
const sinon = require('sinon');
const actions = require('../../src/state/facilityConfigPageActions');

const { resources, __resetMocks } = kolibri;
const FacilityStub = resources.FacilityResource;
const DatasetStub = resources.FacilityDatasetResource;

const fakeFacility = {
  name: 'Nalanda Maths',
};

const fakeDatasets = [
  { id: 2, learner_can_edit_username: false },
  // could return more than one dataset in theory
  { id: 3 },
];

describe.only('facility config page actions', () => {
  const storeMock = {
    dispatch: sinon.spy(),
    state: { core: { pageId: '123' } },
  };

  const dispatchStub = storeMock.dispatch;

  beforeEach(() => {
    __resetMocks();
    dispatchStub.reset();
  });

  describe('showFacilityConfigPage action', () => {
    it('sets up pageState correctly when no problems', () => {
      FacilityStub.__getModelFetchReturns(fakeFacility);
      DatasetStub.__getCollectionFetchReturns(fakeDatasets);
      const expectedPageState = {
        facilityDatasetId: 2,
        facilityName: 'Nalanda Maths',
        settings: { learner_can_edit_username: false },
        settingsCopy: { learner_can_edit_username: false },
      };

      return actions.showFacilityConfigPage(storeMock)
      .then(() => {
        // uses hardcoded facility_id of 1
        sinon.assert.calledWith(DatasetStub.getCollection, { facility_id: 1 });
        sinon.assert.calledWith(dispatchStub, 'SET_PAGE_STATE', sinon.match(expectedPageState));
      });
    });

    it('sets up pageState correctly when fetching Facility fails', () => {
      FacilityStub.__getModelFetchReturns('whatevers', true /* willReject */);
      DatasetStub.__getCollectionFetchReturns(fakeDatasets);
      const expectedPageState = {
        facilityName: '',
        settings: {},
        notification: 'pageload_failure',
      };
      return actions.showFacilityConfigPage(storeMock)
      .then(() => {
        sinon.assert.calledWith(dispatchStub, 'SET_PAGE_STATE', sinon.match(expectedPageState));
      });
    });

    it('sets up pageState correctly when fetching facilityDataset fails', () => {
      FacilityStub.__getModelFetchReturns(fakeFacility);
      DatasetStub.__getCollectionFetchReturns('whatevers', true);
      const expectedPageState = {
        facilityName: '',
        settings: {},
        notification: 'pageload_failure',
      };
      return actions.showFacilityConfigPage(storeMock)
      .then(() => {
        sinon.assert.calledWith(dispatchStub, 'SET_PAGE_STATE', sinon.match(expectedPageState));
      });
    });
  });

  describe('saveFacilityConfig action', () => {
    it('save is successful', () => {
      // IRL returns the updated Model
      const saveStub = DatasetStub.__getModelSaveReturns('ok');
      return actions.saveFacilityConfig(storeMock)
      .then(() => {
        sinon.assert.called(saveStub);
      });
    });

    it('save fails', () => {

    });
  });
});
