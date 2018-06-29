/* eslint-env mocha */
import Vue from 'vue-test'; // eslint-disable-line
import { mockResource } from 'testUtils'; // eslint-disable-line
import sinon from 'sinon';
import { ClassroomResource, ContentNodeResource, ExamResource } from 'kolibri.resources';

import * as examActions from '../src/state/actions/exam';

mockResource(ClassroomResource);
mockResource(ContentNodeResource);
mockResource(ExamResource);

// fakes for data, since they have similar shape
const fakeItems = [
  {
    id: 'item_1',
    name: 'item one',
    root: 'pk1',
    misc: 'ha ha ha',
    learner_count: 5,
  },
  {
    id: 'item_2',
    name: 'item two',
    root: 'pk2',
    misc: 'ha ha ha',
    learner_count: 6,
  },
];

const fakeExams = [
  {
    id: '1',
    title: 'UNIT 1 Exam',
    channel_id: 'item_1',
    collection: 'collection_id',
    active: true,
    archive: false,
    question_count: 100,
    question_sources: '',
    seed: 1234,
    assignments: [
      {
        id: 'assignmentA',
        exam: '1',
        collection: {
          id: 'class_1',
          kind: 'classroom',
          name: 'class_1',
        },
      },
    ],
  },
  {
    id: '2',
    title: 'UNIT 1 Quiz',
    channel_id: 'item_1',
    collection: 'collection_id',
    active: false,
    archive: false,
    question_count: 10,
    question_sources: '',
    seed: 4321,
    assignments: [
      {
        id: 'assignmentB',
        exam: '2',
        collection: {
          id: 'group_1',
          kind: 'learnergroup',
          name: 'group_1',
        },
      },
      {
        id: 'assignmentC',
        exam: '2',
        collection: {
          id: 'group_2',
          kind: 'learnergroup',
          name: 'group_2',
        },
      },
    ],
  },
];

const fakeExamState = [
  {
    id: '1',
    title: 'UNIT 1 Exam',
    channelId: 'item_1',
    collection: 'collection_id',
    active: true,
    archive: false,
    questionCount: 100,
    questionSources: '',
    seed: 1234,
    assignments: [
      {
        id: 'assignmentA',
        exam: '1',
        collection: {
          id: 'class_1',
          kind: 'classroom',
          name: 'class_1',
        },
      },
    ],
  },
  {
    id: '2',
    title: 'UNIT 1 Quiz',
    channelId: 'item_1',
    collection: 'collection_id',
    active: false,
    archive: false,
    questionCount: 10,
    questionSources: '',
    seed: 4321,
    assignments: [
      {
        id: 'assignmentB',
        exam: '2',
        collection: {
          id: 'group_1',
          kind: 'learnergroup',
          name: 'group_1',
        },
      },
      {
        id: 'assignmentC',
        exam: '2',
        collection: {
          id: 'group_2',
          kind: 'learnergroup',
          name: 'group_2',
        },
      },
    ],
  },
];

describe('showPage actions for coach exams section', () => {
  const storeMock = {
    dispatch: sinon.spy(),
    state: { core: { pageSessionId: '' } },
  };

  const dispatchSpy = storeMock.dispatch;

  beforeEach(() => {
    ClassroomResource.__resetMocks();
    ContentNodeResource.__resetMocks();
    ExamResource.__resetMocks();
    dispatchSpy.resetHistory();
  });

  describe('showExamsPage', () => {
    it('store is properly set up when there are no problems', () => {
      ClassroomResource.__getCollectionFetchReturns(fakeItems);
      ExamResource.__getCollectionFetchReturns(fakeExams);

      // Using the weird naming from fakeItems
      const classId = 'item_1';
      return examActions.showExamsPage(storeMock, classId)._promise.then(() => {
        sinon.assert.calledWith(ClassroomResource.getCollection);
        sinon.assert.calledWith(ExamResource.getCollection, { collection: classId });
        // sinon.assert.calledWith(dispatchSpy, 'SET_CLASS_INFO', classId, 'item one', [
        //   { id: 'item_1', name: 'item one', memberCount: 5 },
        //   { id: 'item_2', name: 'item two', memberCount: 6 },
        // ]);
        sinon.assert.calledWith(
          dispatchSpy,
          'SET_PAGE_STATE',
          sinon.match({
            exams: fakeExamState,
            examsModalSet: false,
          })
        );
      });
    });

    it('store is properly set up when there are errors', () => {
      ClassroomResource.__getCollectionFetchReturns(fakeItems);
      ExamResource.__getCollectionFetchReturns('channel error', true);
      return examActions.showExamsPage(storeMock, 'class_1')._promise.catch(() => {
        sinon.assert.calledWith(dispatchSpy, 'CORE_SET_ERROR', 'channel error');
      });
    });
  });
});
