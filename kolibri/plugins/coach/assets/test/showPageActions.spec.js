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

// fakes for data, since they have similar shape
const fakeItems = [
  { id: 'item_1', name: 'item one', root_pk: 'pk1', misc: 'ha ha ha' },
  { id: 'item_2', name: 'item two', root_pk: 'pk2', misc: 'ha ha ha' },
];

describe.only('showExamsPage', () => {
  const storeMock = {
    dispatch: sinon.spy(),
    state: { core: { pageSessionId: '' } },
  };

  it('store is properly setup when there are no problems', () => {
    const channelStub = kolibri.resources.ChannelResource.getCollection = happyGetMock(fakeItems);
    const learnerGroupStub = kolibri.resources.LearnerGroupResource.getCollection = happyGetMock(fakeItems);
    const classroomStub = kolibri.resources.ClassroomResource.getModel = happyGetMock(fakeItems[0]);
    const examStub = kolibri.resources.ExamResource.getCollectionForClass = happyGetMock([]);

    return examActions.showExamsPage(storeMock, 'class_1')._promise
    .then(() => {
      sinon.assert.calledWith(channelStub);
      sinon.assert.calledWith(learnerGroupStub, { parent: 'class_1' });
      sinon.assert.calledWith(classroomStub, 'class_1');
      sinon.assert.calledWith(examStub, 'class_1');
      sinon.assert.calledWith(storeMock.dispatch, 'CORE_SET_TITLE', 'Exams');
      sinon.assert.calledWith(storeMock.dispatch, 'SET_PAGE_STATE', sinon.match({
        channels: [
          { id: 'item_1', name: 'item one', rootPk: 'pk1' },
          { id: 'item_2', name: 'item two', rootPk: 'pk2' },
        ],
        classId: 'class_1',
        currentClass: { id: 'item_1', name: 'item one' },
        currentClassGroups: [
          { id: 'item_1', name: 'item one' },
          { id: 'item_2', name: 'item two' },
        ],
        exams: [],
        modalShown: false,
      }));
    });
  });
});
