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
  { id: 2, learners_can_never_have_fun: false },
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
    storeMock.state.pageState = {};
  });

  describe('showFacilityConfigPage action', () => {
    it('when resources load successfully', () => {
      FacilityStub.__getModelFetchReturns(fakeFacility);
      DatasetStub.__getCollectionFetchReturns(fakeDatasets);
      const expectedPageState = {
        facilityDatasetId: 2,
        facilityName: 'Nalanda Maths',
        settings: { learners_can_never_have_fun: false },
        settingsCopy: { learners_can_never_have_fun: false },
      };

      return actions.showFacilityConfigPage(storeMock)
      .then(() => {
        // uses hardcoded facility_id of 1
        sinon.assert.calledWith(DatasetStub.getCollection, { facility_id: 1 });
        sinon.assert.calledWith(dispatchStub, 'SET_PAGE_STATE', sinon.match(expectedPageState));
      });
    });

    it('when fetching Facility fails', () => {
      FacilityStub.__getModelFetchReturns('incomprehensible error', true);
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

    it('when fetching FacilityDataset fails', () => {
      FacilityStub.__getModelFetchReturns(fakeFacility);
      DatasetStub.__getCollectionFetchReturns('incomprehensible error', true);
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
    it('when save is successful', () => {
      storeMock.state.pageState = {
        facilityDatasetId: 1000,
        settings: {
          learners_must_be_constantly_awesome: true,
        },
      };
      // IRL returns the updated Model
      const saveStub = DatasetStub.__getModelSaveReturns('ok');

      return actions.saveFacilityConfig(storeMock)
      .then(() => {
        sinon.assert.calledWith(DatasetStub.getModel, 1000);
        sinon.assert.calledWith(saveStub, sinon.match({
          learners_must_be_constantly_awesome: true,
        }));
        sinon.assert.calledWith(storeMock.dispatch, 'CONFIG_PAGE_NOTIFY', 'save_success');
      });
    });

    it('when save fails', () => {

    });
  });
});
