/* eslint-env mocha */
const kolibri = require('kolibri');
const sinon = require('sinon');
const actions = require('../../src/state/facilityConfigPageActions');

const { resources, __resetMocks } = kolibri;
const getFacilityStub = resources.FacilityResource.getModel;
const getDatasetsStub = resources.FacilityDatasetResource.getCollection;

const fakeFacility = {
  name: 'Nalanda Maths',
};

const fakeDataset = [
  {
    id: 2,
    learner_can_edit_username: false,
    learner_can_edit_name: true,
    learner_can_edit_password: false,
    learner_can_sign_up: true,
    learner_can_delete_account: true,
    description: '',
    location: '',
  },
  // could return more than one dataset in theory
  { id: 3 },
];

describe.only('showFacilityConfigPage action', () => {
  const storeMock = {
    dispatch: sinon.spy(),
  };

  const dispatchStub = storeMock.dispatch;

  beforeEach(() => {
    __resetMocks();
    dispatchStub.reset();
  });

  it('sets up pageState correctly when no problems', () => {
    getFacilityStub.returns(fakeFacility);
    getDatasetsStub.returns(fakeDataset);
    const expectedPageState = {
      facilityName: 'Nalanda Maths',
      settings: {
        learner_can_edit_username: false,
        learner_can_edit_name: true,
        learner_can_edit_password: false,
        learner_can_sign_up: true,
        learner_can_delete_account: true,
      },
      notification: {},
    };

    return actions.showFacilityConfigPage(storeMock)._promise
    .then(() => {
      // uses hardcoded facility_id of 1
      sinon.assert.calledWith(getDatasetsStub, { facility_id: 1 });
      sinon.assert.calledWith(dispatchStub, 'SET_PAGE_STATE', sinon.match(expectedPageState));
    });
  });
});
