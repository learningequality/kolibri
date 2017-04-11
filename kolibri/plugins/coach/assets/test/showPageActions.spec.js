/* eslint-env mocha */
const sinon = require('sinon');
const kolibri = require('kolibri');

// Add fake Resources to kolibri mock. This needs to be done before loading tested module
kolibri.resources = {
  ChannelResource: {
    getCollection: sinon.stub(),
  },
  ClassroomResource: {
    getModel: sinon.stub(),
  },
  ContentNodeResource: {},
  ExamResource: {
    getCollection: sinon.stub(),
  },
  LearnerGroupResource: {
    getCollection: sinon.stub(),
  },
};

const examActions = require('../src/state/actions/exam');

const channelStub = kolibri.resources.ChannelResource.getCollection;
const classroomStub = kolibri.resources.ClassroomResource.getModel;
const examStub = kolibri.resources.ExamResource.getCollection;
const learnerGroupStub = kolibri.resources.LearnerGroupResource.getCollection;

// mocks either getCollection, or getModel where request is successful
function makeHappyFetchable(fetchResult = {}) {
  return { fetch: () => Promise.resolve(fetchResult) };
}

function makeSadFetchable(fetchResult = {}) {
  return { fetch: () => Promise.reject(fetchResult) };
}

// fakes for data, since they have similar shape
const fakeItems = [
  { id: 'item_1', name: 'item one', root_pk: 'pk1', misc: 'ha ha ha' },
  { id: 'item_2', name: 'item two', root_pk: 'pk2', misc: 'ha ha ha' },
];

const fakeExams = [
  {
    id: '1',
    title: 'UNIT 1 Exam',
    active: false,
    visibility: {
      class: false,
      groups: [{ id: '1', name: 'groupA' }, { id: '2', name: 'groupA' }]
    },
  },
  {
    id: '2',
    title: 'UNIT 1 Quiz',
    active: true,
    visibility: {
      class: false,
      groups: [{ id: '1', name: 'groupA' }],
    },
  }
];

describe('showPage actions for coach exams section', () => {
  const storeMock = {
    dispatch: sinon.spy(),
    state: { core: { pageSessionId: '' } },
  };

  const dispatchSpy = storeMock.dispatch;

  beforeEach(() => {
    channelStub.reset();
    classroomStub.reset();
    dispatchSpy.reset();
    examStub.reset();
    learnerGroupStub.reset();
  });

  after(() => {
    kolibri.resources = {};
  });

  describe('showExamsPage', () => {
    it('store is properly set up when there are no problems', () => {
      channelStub.returns(makeHappyFetchable(fakeItems));
      learnerGroupStub.returns(makeHappyFetchable(fakeItems));
      classroomStub.returns(makeHappyFetchable(fakeItems[0]));
      examStub.returns(makeHappyFetchable(fakeExams));

      return examActions.showExamsPage(storeMock, 'class_1')._promise
      .then(() => {
        sinon.assert.calledWith(channelStub);
        sinon.assert.calledWith(learnerGroupStub, { parent: 'class_1' });
        sinon.assert.calledWith(classroomStub, 'class_1');
        sinon.assert.calledWith(examStub, { collection: 'class_1' });
        sinon.assert.calledWith(dispatchSpy, 'SET_PAGE_STATE', sinon.match({
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
          // exams: fakeExams,
          modalShown: false,
        }));
      });
    });

    it('store is properly set up when there are errors', () => {
      channelStub.returns(makeSadFetchable('channel error'));
      learnerGroupStub.returns(makeHappyFetchable(fakeItems));
      classroomStub.returns(makeHappyFetchable(fakeItems[0]));
      examStub.returns(makeHappyFetchable(fakeExams));
      return examActions.showExamsPage(storeMock, 'class_1')._promise
      .catch(() => {
        sinon.assert.calledWith(dispatchSpy, 'CORE_SET_ERROR', 'channel error');
      });
    });
  });
});
