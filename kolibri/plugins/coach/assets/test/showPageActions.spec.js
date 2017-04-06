/* eslint-env mocha */
/* eslint-disable no-multi-assign */
const sinon = require('sinon');
const kolibri = require('kolibri');
const assert = require('assert');

// add fake Resources to kolibri mock. This needs to be done before loading tested module
kolibri.resources = {
  ChannelResource: {
    getModel: () => {},
  },
  ClassroomResource: {
    getModel: () => {},
  },
  ContentNodeResource: {},
  ExamResource: {
    getCollectionForClass: () => {},
  },
  LearnerGroupResource: {
    getCollection: () => {},
  },
};

const examActions = require('../src/state/actions/exam');

// mocks either getCollection, or getModel where request is successful
function happyGetMock(fetchResult = {}) {
  return sinon.stub().returns({
    fetch: () => Promise.resolve(fetchResult),
  });
}

function sadFetchMock(fetchResult = {}) {
  return sinon.stub().returns({
    fetch: () => Promise.reject(fetchResult),
  });
}

describe.only('showExamsPage', () => {
  const storeMock = {
    dispatch: sinon.spy(),
    state: { core: { pageSessionId: '' } },
  };

  const fakeChannels = [];
  const fakeLearners = [];
  const fakeClassroom = {};
  const fakeExams = [];

  it('store is properly setup when there are no problems', () => {
    const channelStub = kolibri.resources.ChannelResource.getCollection = happyGetMock([]);
    const learnerGroupStub = kolibri.resources.LearnerGroupResource.getCollection = happyGetMock([]);
    const classroomStub = kolibri.resources.ClassroomResource.getModel = happyGetMock({});
    const examStub = kolibri.resources.ExamResource.getCollectionForClass = happyGetMock([]);

    return examActions.showExamsPage(storeMock, 'class_1')._promise
    .then(() => {
      sinon.assert.calledWith(channelStub);
      sinon.assert.calledWith(learnerGroupStub, { parent: 'class_1' });
      sinon.assert.calledWith(classroomStub, 'class_1');
      sinon.assert.calledWith(examStub, 'class_1');
    });
  });
});
