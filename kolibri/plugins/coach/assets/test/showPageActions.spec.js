/* eslint-env mocha */
import Vue from 'vue-test'; // eslint-disable-line
import { mockResource } from 'testUtils'; // eslint-disable-line
import sinon from 'sinon';
import {
  ChannelResource,
  ClassroomResource,
  ContentNodeResource,
  ExamResource,
  LearnerGroupResource,
} from 'kolibri.resources';

import * as examActions from '../src/state/actions/exam';

mockResource(ChannelResource);
mockResource(ClassroomResource);
mockResource(ContentNodeResource);
mockResource(ExamResource);
mockResource(LearnerGroupResource);

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
    visibility: {
      class: {
        assignmentId: 'assignmentA',
        collection: {
          id: 'class_1',
          kind: 'classroom',
          name: 'class_1',
        },
        examId: '1',
      },
      groups: [],
    },
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
    visibility: {
      class: undefined,
      groups: [
        {
          assignmentId: 'assignmentB',
          collection: {
            id: 'group_1',
            kind: 'learnergroup',
            name: 'group_1',
          },
          examId: '2',
        },
        {
          assignmentId: 'assignmentC',
          collection: {
            id: 'group_2',
            kind: 'learnergroup',
            name: 'group_2',
          },
          examId: '2',
        },
      ],
    },
  },
];

describe('showPage actions for coach exams section', () => {
  const storeMock = {
    dispatch: sinon.spy(),
    state: { core: { pageSessionId: '' } },
  };

  const dispatchSpy = storeMock.dispatch;

  beforeEach(() => {
    ChannelResource.__resetMocks();
    ClassroomResource.__resetMocks();
    ContentNodeResource.__resetMocks();
    ExamResource.__resetMocks();
    LearnerGroupResource.__resetMocks();
    dispatchSpy.reset();
  });

  describe('showExamsPage', () => {
    it('store is properly set up when there are no problems', () => {
      ChannelResource.__getCollectionFetchReturns(fakeItems);
      LearnerGroupResource.__getCollectionFetchReturns(fakeItems);
      ClassroomResource.__getCollectionFetchReturns(fakeItems);
      ExamResource.__getCollectionFetchReturns(fakeExams);

      // Using the weird naming from fakeItems
      const classId = 'item_1';
      return examActions.showExamsPage(storeMock, classId)._promise.then(() => {
        sinon.assert.calledWith(ChannelResource.getCollection);
        sinon.assert.calledWith(LearnerGroupResource.getCollection, { parent: classId });
        sinon.assert.calledWith(ClassroomResource.getCollection);
        sinon.assert.calledWith(ExamResource.getCollection, { collection: classId });
        sinon.assert.calledWith(dispatchSpy, 'SET_CLASS_INFO', classId, 'item one', [
          { id: 'item_1', name: 'item one', memberCount: 5 },
          { id: 'item_2', name: 'item two', memberCount: 6 },
        ]);
        sinon.assert.calledWith(
          dispatchSpy,
          'SET_PAGE_STATE',
          sinon.match({
            channels: [
              { id: 'item_1', name: 'item one', rootPk: 'pk1' },
              { id: 'item_2', name: 'item two', rootPk: 'pk2' },
            ],
            currentClassGroups: [
              { id: 'item_1', name: 'item one' },
              { id: 'item_2', name: 'item two' },
            ],
            exams: fakeExamState,
            examModalShown: false,
          })
        );
      });
    });

    it('store is properly set up when there are errors', () => {
      ChannelResource.__getCollectionFetchReturns('channel error', true);
      LearnerGroupResource.__getCollectionFetchReturns(fakeItems);
      ClassroomResource.__getCollectionFetchReturns(fakeItems);
      ExamResource.__getCollectionFetchReturns(fakeExams);
      return examActions.showExamsPage(storeMock, 'class_1')._promise.catch(() => {
        sinon.assert.calledWith(dispatchSpy, 'CORE_SET_ERROR', 'channel error');
      });
    });
  });
});
