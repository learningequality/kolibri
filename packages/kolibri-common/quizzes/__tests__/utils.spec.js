import map from 'lodash/map';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import { MAX_QUESTIONS_PER_QUIZ_SECTION } from 'kolibri/constants';
import { convertExamQuestionSources } from '../utils';

// map of content IDs to lists of question IDs
const QUESTION_IDS = {
  '69e5e6abf479581483d441b83d7d76f4': [
    'a5f508eb2ba05d429812dc43b577ef03',
    '3aeb023925e35001865091de1fb4d3ae',
    'beb5eae9491c564fb6bc5b9c1421d085',
    'b19341ebca9a5bdb817cdc31b8d62993',
    '10e6239f9cf35b75b0cf75ca7f7e6a14',
    '4dd2526065ee572998a06b1fdae9cb4b',
    '06bb1d1bdd6250c4ad4912c558801139',
    'e226724765085214acfb807942918fed',
    '6ef7996754de54ad92b660d06436976c',
    'eef16d7ec8895cfda3cb9922bd4c593e',
    '50065107c7a0581e9bb30911ba6cc379',
    'e92a277052cf56e2aaae44338fa0bfec',
    '84f8e275aec652bf8a418d133e422f7f',
    '9e54ffbf7138534982c617e52d5907bb',
    '642e2e18170055d2b44b0e408038176c',
    'fc60ecb9f83f505fa31e734e517e6523',
    '8358fbbd0a285e9d99da558094eabd4c',
    'bb6fb988d6ec524d95b72bac861d55a9',
    'cce3659096295edca9aaeff623fa4a50',
    'fc5958e2a67d5cd2bd48962e9e1c35c3',
  ],
  b9444e7d11395946b2e14edb5dc4670f: [
    '1e0ce47a58465b2cb298acd3b893dce5',
    '952857e446b95c5da36226f59237ffcc',
    'a654dec351af5bdf937566e46b7c2fc3',
    'f7caed6869895e04a55cc7b424c53db5',
    'dc75e72c673d57388118d9230437f0b3',
    'dd1a05b3b3c1577da59598a2577adf29',
    '830a22d17731582e8dba7f125035d7d8',
    'e3afac153f1458dd882534bcb705086d',
    '6048bdf15a6357c8828b3d288af55ca4',
    '4b14d710169551b3b147db7ef5f9dc00',
    '219edc14b2f35d118a5497bb4a781299',
    '1a608dbb390e57a2a38b0c15ae1c4311',
    '1fd4155ca33b5723bd9eb508887b532f',
    '05c013b59e005d8b98107ed71a4604bd',
    '19421254d90d520d981bd07fd6ede9b2',
    '263fc40f9f3c5ef69f29c7f599c01491',
    '96646238594c55799ebd546f2cd513cb',
    'bbbb37c262975dadb9763d95fa35ed52',
    'a8acdf6150a35e83884a0b9cc7d4804c',
  ],
  b186a2a3ae8e51dd867614db03eb3783: [
    'da0930c1389a5dcc814a538692e78003',
    '325d8cedaa8b5add88fee6533fcfbc29',
    '2f998692fb26520eb8f185ed0ffdb4a4',
    '0b5079cfa9c45c08a836f58af39c9629',
    '8be357a016e05ec48fb074a2d349e27d',
    '2f5fdbc49ce35310abf49971867ac94e',
    '5a56a46b261d5ff7b3f870cf09c6952f',
    '539c8d988648515c89ee46dc212869c2',
    '881fd4b0ae4f582e9c68c81d1b4e1154',
    'd3ac055fa4ad599bbd30a00eaeb93e5e',
    'eca7fa77e48e5ed696e0022fe9347462',
    '6bed23ebce3e5f23b03d184ffef26777',
    'd4623921a2ef5ddaa39048c0f7a6fe06',
    '8c182b5dbcaf5328a9a16199e7a10351',
    '5a5873ed1944507d8c8794a2051d50cb',
    '16a47138835858148b1dc07f9ba01272',
    'e5da96289ead5db08272156487908131',
    'd1e81cac3ef65678b4b732c07641ee36',
    '811aa9dcc7a6550580f6b8029aa5940b',
    '11d0b9d97ea3542caa370620369801f8',
    '899f3ab919f359f9a8fd24d64d95f6d5',
    '7df44f6db33059898d6365279caed53d',
  ],
};

const contentNodes = map(QUESTION_IDS, (assessmentIds, nodeId) => {
  // See core/mappers/assessmentMetaDataState to see why we mock ContentNodes this way
  return {
    id: nodeId,
    assessmentmetadata: { assessment_item_ids: assessmentIds, mastery_model: { ultimate: true } },
  };
});

jest.mock('kolibri-common/apiResources/ContentNodeResource');
ContentNodeResource.fetchCollection = jest.fn(() => Promise.resolve(contentNodes));

describe('exam utils', () => {
  describe('convertExamQuestionSources converting from any previous version to V3', () => {
    let exam;
    let expectedSources;
    beforeEach(() => {
      // Stolen from test below to ensure we're getting expected V2 values... as expected
      exam = {
        data_model_version: 1,
        learners_see_fixed_order: true,
        question_count: 8,
        question_sources: [
          {
            exercise_id: 'E1',
            question_id: 'Q1',
            title: 'Question 1',
          },
          {
            exercise_id: 'E1',
            question_id: 'Q2',
            title: 'Question 2',
          },
          {
            exercise_id: 'E2',
            question_id: 'Q1',
            title: 'Question 1',
          },
        ],
      };
      expectedSources = [
        {
          exercise_id: 'E1',
          question_id: 'Q1',
          title: '',
          counter_in_exercise: 1,
          item: 'E1:Q1',
        },
        {
          exercise_id: 'E1',
          question_id: 'Q2',
          title: '',
          counter_in_exercise: 2,
          item: 'E1:Q2',
        },
        {
          exercise_id: 'E2',
          question_id: 'Q1',
          title: '',
          counter_in_exercise: 1,
          item: 'E2:Q1',
        },
      ];
    });

    it('returns an array of newly structured objects with old question sources in questions', async () => {
      const converted = await convertExamQuestionSources(exam);
      expect(converted.question_sources).toEqual([
        {
          section_title: '',
          description: '',
          questions: expectedSources.sort(),
          learners_see_fixed_order: true,
        },
      ]);
    });
    it('sets the fixed order property to what the exam property value is', async () => {
      exam.learners_see_fixed_order = false;
      const converted = await convertExamQuestionSources(exam);
      expect(converted.question_sources[0].learners_see_fixed_order).toEqual(false);
    });
    it('always sets the question_count and learners_see_fixed_order properties to the original exam values', async () => {
      exam.learners_see_fixed_order = false;
      exam.question_count = 12;
      const converted = await convertExamQuestionSources(exam);
      expect(converted.question_sources).toEqual([
        {
          section_title: '',
          description: '',
          questions: expectedSources.sort(),
          learners_see_fixed_order: false,
        },
      ]);
    });
  });
  describe('convertExamQuestionSources converting from V1 to V3', () => {
    it('returns a question_sources array with a counter_in_exercise field', async () => {
      const exam = {
        data_model_version: 1,
        question_sources: [
          {
            exercise_id: 'E1',
            question_id: 'Q1',
            title: 'Question 1',
          },
          {
            exercise_id: 'E1',
            question_id: 'Q2',
            title: 'Question 2',
          },
          {
            exercise_id: 'E2',
            question_id: 'Q1',
            title: 'Question 1',
          },
        ],
      };
      const converted = await convertExamQuestionSources(exam);
      const expectedOutput = [
        {
          exercise_id: 'E1',
          question_id: 'Q1',
          title: '',
          counter_in_exercise: 1,
          item: 'E1:Q1',
        },
        {
          exercise_id: 'E1',
          question_id: 'Q2',
          title: '',
          counter_in_exercise: 2,
          item: 'E1:Q2',
        },
        {
          exercise_id: 'E2',
          question_id: 'Q1',
          title: '',
          counter_in_exercise: 1,
          item: 'E2:Q1',
        },
      ];
      expect(converted.question_sources[0].questions).toEqual(expectedOutput);
    });
    it('renames counterInExercise field if it has it', async () => {
      const exam = {
        data_model_version: 1,
        question_sources: [
          {
            question_id: 'Q1',
            exercise_id: 'E1',
            title: 'Question 1',
            counterInExercise: 4000,
          },
          {
            question_id: 'Q1',
            exercise_id: 'E2',
            title: 'Question 2',
            counterInExercise: 1,
          },
        ],
      };
      const converted = await convertExamQuestionSources(exam);
      expect(converted.question_sources[0].questions).toEqual([
        {
          question_id: 'Q1',
          exercise_id: 'E1',
          title: '',
          counter_in_exercise: 4000,
          item: 'E1:Q1',
        },
        {
          question_id: 'Q1',
          exercise_id: 'E2',
          title: '',
          counter_in_exercise: 1,
          item: 'E2:Q1',
        },
      ]);
    });
    it('renames creates multiple sections if the questions are longer than MAX_QUESTIONS_PER_QUIZ_SECTION', async () => {
      const question_sources = [];
      for (let i = 0; i < MAX_QUESTIONS_PER_QUIZ_SECTION + 1; i++) {
        question_sources.push({
          exercise_id: 'E1',
          question_id: `Q${i}`,
          title: `Question ${i + 1}`,
          counter_in_exercise: i + 1,
        });
      }
      const exam = {
        data_model_version: 1,
        question_sources,
      };
      const converted = await convertExamQuestionSources(exam);
      expect(converted.question_sources.length).toEqual(2);
      expect(converted.question_sources[0].questions.length).toEqual(
        MAX_QUESTIONS_PER_QUIZ_SECTION,
      );
      expect(converted.question_sources[1].questions.length).toEqual(1);
    });
  });

  describe('convertExamQuestionSources converting from V0 to V3', () => {
    it('should return 10 specific ordered questions from 3 exercises', async () => {
      const exam = {
        data_model_version: 0,
        seed: 423,
        question_sources: [
          {
            exercise_id: 'b9444e7d11395946b2e14edb5dc4670f',
            number_of_questions: 3,
            title: 'Count in order',
          },
          {
            exercise_id: '69e5e6abf479581483d441b83d7d76f4',
            number_of_questions: 4,
            title: 'Count with small numbers',
          },
          {
            exercise_id: 'b186a2a3ae8e51dd867614db03eb3783',
            number_of_questions: 3,
            title: 'Find 1 more or 1 less than a number',
          },
        ],
      };
      const converted = await convertExamQuestionSources(exam);

      /*
        The selected questions should be:

        1.  7 squirrels in a box
        2.  12 whales
        3.  3 foxes
        4.  count bananas
        5.  count mice (3, 5)
        6.  18 apples left
        7.  4 foxes
        8.  9 pieces of cheese
        9.  6 mice
        10. missing apples (3, 8)
      */
      const expectedOutput = [
        {
          counter_in_exercise: 16,
          question_id: 'fc60ecb9f83f505fa31e734e517e6523',
          exercise_id: '69e5e6abf479581483d441b83d7d76f4',
          title: '',
        },
        {
          counter_in_exercise: 13,
          question_id: 'd4623921a2ef5ddaa39048c0f7a6fe06',
          exercise_id: 'b186a2a3ae8e51dd867614db03eb3783',
          title: '',
        },
        {
          counter_in_exercise: 6,
          question_id: '2f5fdbc49ce35310abf49971867ac94e',
          exercise_id: 'b186a2a3ae8e51dd867614db03eb3783',
          title: '',
        },
        {
          counter_in_exercise: 15,
          question_id: '19421254d90d520d981bd07fd6ede9b2',
          exercise_id: 'b9444e7d11395946b2e14edb5dc4670f',
          title: '',
        },
        {
          counter_in_exercise: 1,
          question_id: '1e0ce47a58465b2cb298acd3b893dce5',
          exercise_id: 'b9444e7d11395946b2e14edb5dc4670f',
          title: '',
        },
        {
          counter_in_exercise: 10,
          question_id: 'd3ac055fa4ad599bbd30a00eaeb93e5e',
          exercise_id: 'b186a2a3ae8e51dd867614db03eb3783',
          title: '',
        },
        {
          counter_in_exercise: 1,
          question_id: 'a5f508eb2ba05d429812dc43b577ef03',
          exercise_id: '69e5e6abf479581483d441b83d7d76f4',
          title: '',
        },
        {
          counter_in_exercise: 17,
          question_id: '8358fbbd0a285e9d99da558094eabd4c',
          exercise_id: '69e5e6abf479581483d441b83d7d76f4',
          title: '',
        },
        {
          counter_in_exercise: 2,
          question_id: '3aeb023925e35001865091de1fb4d3ae',
          exercise_id: '69e5e6abf479581483d441b83d7d76f4',
          title: '',
        },
        {
          counter_in_exercise: 3,
          question_id: 'a654dec351af5bdf937566e46b7c2fc3',
          exercise_id: 'b9444e7d11395946b2e14edb5dc4670f',
          title: '',
        },
      ];

      expect(converted.question_sources[0].questions).toEqual(
        expectedOutput.map(q => {
          q.item = `${q.exercise_id}:${q.question_id}`;
          return q;
        }),
      );
    });
    it('should return 10 specific ordered questions from 1 exercise', async () => {
      const exam = {
        data_model_version: 0,
        question_sources: [
          {
            exercise_id: '69e5e6abf479581483d441b83d7d76f4',
            number_of_questions: 10,
            title: 'Count with small numbers',
          },
        ],
        seed: 837,
      };
      const converted = await convertExamQuestionSources(exam);
      const expectedOutput = [
        {
          counter_in_exercise: 20,
          question_id: 'fc5958e2a67d5cd2bd48962e9e1c35c3',
          exercise_id: '69e5e6abf479581483d441b83d7d76f4',
          title: '',
        },
        {
          counter_in_exercise: 3,
          question_id: 'beb5eae9491c564fb6bc5b9c1421d085',
          exercise_id: '69e5e6abf479581483d441b83d7d76f4',
          title: '',
        },
        {
          counter_in_exercise: 2,
          question_id: '3aeb023925e35001865091de1fb4d3ae',
          exercise_id: '69e5e6abf479581483d441b83d7d76f4',
          title: '',
        },
        {
          counter_in_exercise: 17,
          question_id: '8358fbbd0a285e9d99da558094eabd4c',
          exercise_id: '69e5e6abf479581483d441b83d7d76f4',
          title: '',
        },
        {
          counter_in_exercise: 6,
          question_id: '4dd2526065ee572998a06b1fdae9cb4b',
          exercise_id: '69e5e6abf479581483d441b83d7d76f4',
          title: '',
        },
        {
          counter_in_exercise: 5,
          question_id: '10e6239f9cf35b75b0cf75ca7f7e6a14',
          exercise_id: '69e5e6abf479581483d441b83d7d76f4',
          title: '',
        },
        {
          counter_in_exercise: 12,
          question_id: 'e92a277052cf56e2aaae44338fa0bfec',
          exercise_id: '69e5e6abf479581483d441b83d7d76f4',
          title: '',
        },
        {
          counter_in_exercise: 9,
          question_id: '6ef7996754de54ad92b660d06436976c',
          exercise_id: '69e5e6abf479581483d441b83d7d76f4',
          title: '',
        },
        {
          counter_in_exercise: 4,
          question_id: 'b19341ebca9a5bdb817cdc31b8d62993',
          exercise_id: '69e5e6abf479581483d441b83d7d76f4',
          title: '',
        },
        {
          counter_in_exercise: 8,
          question_id: 'e226724765085214acfb807942918fed',
          exercise_id: '69e5e6abf479581483d441b83d7d76f4',
          title: '',
        },
      ];
      expect(converted.question_sources[0].questions).toEqual(
        expectedOutput.map(q => {
          q.item = `${q.exercise_id}:${q.question_id}`;
          return q;
        }),
      );
    });
    it('should return 3 specific ordered questions from 3 exercises', async () => {
      const exam = {
        data_model_version: 0,
        question_sources: [
          {
            exercise_id: 'b9444e7d11395946b2e14edb5dc4670f',
            number_of_questions: 1,
            title: 'Count in order',
          },
          {
            exercise_id: '69e5e6abf479581483d441b83d7d76f4',
            number_of_questions: 1,
            title: 'Count with small numbers',
          },
          {
            exercise_id: 'b186a2a3ae8e51dd867614db03eb3783',
            number_of_questions: 1,
            title: 'Find 1 more or 1 less than a number',
          },
        ],
        seed: 168,
      };
      const converted = await convertExamQuestionSources(exam);
      const expectedOutput = [
        {
          counter_in_exercise: 9,
          question_id: '6ef7996754de54ad92b660d06436976c',
          exercise_id: '69e5e6abf479581483d441b83d7d76f4',
          title: '',
        },
        {
          counter_in_exercise: 2,
          question_id: '952857e446b95c5da36226f59237ffcc',
          exercise_id: 'b9444e7d11395946b2e14edb5dc4670f',
          title: '',
        },
        {
          counter_in_exercise: 7,
          question_id: '5a56a46b261d5ff7b3f870cf09c6952f',
          exercise_id: 'b186a2a3ae8e51dd867614db03eb3783',
          title: '',
        },
      ];
      expect(converted.question_sources[0].questions).toEqual(
        expectedOutput.map(q => {
          q.item = `${q.exercise_id}:${q.question_id}`;
          return q;
        }),
      );
    });
  });
});
