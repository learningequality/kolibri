import { jestMockResource } from 'testUtils'; // eslint-disable-line
import { ClassroomResource, ContentNodeResource, ExamResource } from 'kolibri.resources';
import { showExamsPage } from '../src/modules/examsRoot/handlers';
import makeStore from './makeStore';

jestMockResource(ClassroomResource);
jestMockResource(ContentNodeResource);
jestMockResource(ExamResource);

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
    collection: 'collection_id',
    active: true,
    archive: false,
    question_count: 8,
    question_sources: [
      {
        exercise_id: '12345',
        number_of_questions: 6,
        title: 'exercise title 1',
      },
      {
        exercise_id: '54321',
        number_of_questions: 2,
        title: 'exercise title 2',
      },
    ],
    seed: 1234,
    learners_see_fixed_order: false,
    data_model_version: 0,
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
    collection: 'collection_id',
    active: false,
    archive: false,
    question_count: 10,
    question_sources: [
      {
        exercise_id: 'xyz',
        number_of_questions: 3,
        title: 'exercise title 3',
      },
      {
        exercise_id: 'abc',
        number_of_questions: 3,
        title: 'exercise title 4',
      },
      {
        exercise_id: '123',
        number_of_questions: 4,
        title: 'exercise title 5',
      },
    ],
    seed: 4321,
    learners_see_fixed_order: false,
    data_model_version: 0,
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
  {
    id: '3',
    title: 'Newer quiz style',
    collection: 'collection_id',
    active: false,
    archive: false,
    question_count: 3,
    question_sources: [
      {
        exercise_id: 'exercise_3',
        question_id: '00001',
        title: 'exercise title 3',
      },
      {
        exercise_id: 'exercise_4',
        question_id: '00002',
        title: 'exercise title 4',
      },
      {
        exercise_id: 'exercise_5',
        question_id: '00003',
        title: 'exercise title 5',
      },
      {
        exercise_id: 'exercise_5',
        question_id: '00001',
        title: 'exercise title 5',
      },
    ],
    seed: 4321,
    learners_see_fixed_order: true,
    data_model_version: 1,
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
    collection: 'collection_id',
    active: true,
    archive: false,
    questionCount: 8,
    questionSources: [
      {
        exercise_id: '12345',
        number_of_questions: 6,
        title: 'exercise title 1',
      },
      {
        exercise_id: '54321',
        number_of_questions: 2,
        title: 'exercise title 2',
      },
    ],
    seed: 1234,
    dataModelVersion: 0,
    learnersSeeFixedOrder: false,
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
    collection: 'collection_id',
    active: false,
    archive: false,
    questionCount: 10,
    questionSources: [
      {
        exercise_id: 'xyz',
        number_of_questions: 3,
        title: 'exercise title 3',
      },
      {
        exercise_id: 'abc',
        number_of_questions: 3,
        title: 'exercise title 4',
      },
      {
        exercise_id: '123',
        number_of_questions: 4,
        title: 'exercise title 5',
      },
    ],
    seed: 4321,
    dataModelVersion: 0,
    learnersSeeFixedOrder: false,
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
  {
    id: '3',
    title: 'Newer quiz style',
    collection: 'collection_id',
    active: false,
    archive: false,
    questionCount: 3,
    questionSources: [
      {
        exercise_id: 'exercise_3',
        question_id: '00001',
        title: 'exercise title 3',
      },
      {
        exercise_id: 'exercise_4',
        question_id: '00002',
        title: 'exercise title 4',
      },
      {
        exercise_id: 'exercise_5',
        question_id: '00003',
        title: 'exercise title 5',
      },
      {
        exercise_id: 'exercise_5',
        question_id: '00001',
        title: 'exercise title 5',
      },
    ],
    seed: 4321,
    dataModelVersion: 1,
    learnersSeeFixedOrder: true,
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

// generate some more sample data - metainfo about the exercises used in the exams
const exerciseContentNodes = [];
fakeExamState.forEach(fakeExam => {
  let questionIds = [];
  if (fakeExam.dataModelVersion === 0) {
    // create an arbitrary array, because v0 didn't know about question IDs
    questionIds = Array.from(Array(20).keys());
  } else if (fakeExam.dataModelVersion === 1) {
    // Generate a list of IDs based on what we know the exam is referencing.
    // This isn't quite accurate because it takes all question IDs from all exercises.
    // ¯\_(ツ)_/¯
    questionIds = fakeExam.questionSources.map(question => question.question_id);
  }
  fakeExam.questionSources.forEach(question => {
    // mirrors what comes back from the ContentNode endpoints
    exerciseContentNodes.push({
      id: question.exercise_id,
      title: question.title,
      assessmentmetadata: [
        { assessment_item_ids: questionIds, mastery_model: { doStuff: 'doStuff' } },
      ],
    });
  });
});

describe('showPage actions for coach exams section', () => {
  let store;
  beforeEach(() => {
    store = makeStore();
    ClassroomResource.__resetMocks();
    ContentNodeResource.__resetMocks();
    ExamResource.__resetMocks();
  });

  describe('showExamsPage', () => {
    it('store is properly set up when there are no problems', async () => {
      ClassroomResource.__getCollectionFetchReturns(fakeItems);
      ExamResource.__getCollectionFetchReturns(fakeExams);
      ExamResource.__getCollectionFetchReturns(fakeExams);

      // Using the weird naming from fakeItems
      const classId = 'item_1';
      await showExamsPage(store, classId)._promise;
      expect(ExamResource.getCollection).toHaveBeenCalledWith({ collection: classId });
      expect(store.state.examsRoot).toMatchObject({
        exams: fakeExamState,
        examsModalSet: false,
        busy: false,
      });
    });

    it('store is properly set up when there are errors', async () => {
      ClassroomResource.__getCollectionFetchReturns(fakeItems);
      ExamResource.__getCollectionFetchReturns('channel error', true);
      try {
        await showExamsPage(store, 'class_1')._promise;
      } catch (error) {
        expect(store.state.core.error).toEqual('channel error');
      }
    });
  });
});
