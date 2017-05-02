/* eslint-env mocha */
const prepareLearnApp = require('../../src/state/prepareLearnApp');
const sinon = require('sinon');

describe.only('prepareLearnApp action', () => {
  const mockStore = {
    dispatch: sinon.spy(),
    state: {
      core: {
        session: {}
      },
    },
  };

  const dispatchSpy = mockStore.dispatch;

  beforeEach(() => {
    dispatchSpy.reset();
    mockStore.state.core.session = {};
  });

  it('prepares app state for guest user', () => {
    mockStore.state.core.session.user_id = null;
    return prepareLearnApp(mockStore)
    .then(() => {
      sinon.assert.calledWith(dispatchSpy, 'LEARN_SET_MEMBERSHIPS', []);
    });
  });
});
