import useContentNodeProgress, { setContentNodeProgress } from '../useContentNodeProgress';

const { contentNodeProgressMap, contentNodeProgressMetaDataMap } = useContentNodeProgress();

const initialCounts = {
  num_question_answered: 1,
  num_question_answered_correctly: 1,
  total_questions: 3,
};

describe('setContentNodeProgress', () => {
  it.each([
    {
      name: 'keeps question counts after a progress-only update',
      contentId: 'progress-only',
      initialProgress: 0.3,
      update: { progress: 0.5 },
      expectedCounts: initialCounts,
    },
    {
      name: 'updates question counts without lowering progress',
      contentId: 'lower-progress',
      initialProgress: 0.5,
      update: {
        progress: 0.3,
        num_question_answered: 2,
        num_question_answered_correctly: 2,
        total_questions: 3,
      },
      expectedCounts: {
        num_question_answered: 2,
        num_question_answered_correctly: 2,
        total_questions: 3,
      },
    },
    {
      name: 'updates only the question count provided',
      contentId: 'partial-counts',
      initialProgress: 0.5,
      update: { num_question_answered: 2 },
      expectedCounts: { ...initialCounts, num_question_answered: 2 },
    },
    {
      name: 'stores zero counts and a changed total at lower progress',
      contentId: 'zero-counts',
      initialProgress: 0.5,
      update: {
        progress: 0.3,
        num_question_answered: 0,
        num_question_answered_correctly: 0,
        total_questions: 4,
      },
      expectedCounts: {
        num_question_answered: 0,
        num_question_answered_correctly: 0,
        total_questions: 4,
      },
    },
    {
      name: 'stores explicitly null question counts',
      contentId: 'null-counts',
      initialProgress: 0.5,
      update: {
        progress: 0.5,
        num_question_answered: null,
        num_question_answered_correctly: null,
        total_questions: 3,
      },
      expectedCounts: {
        num_question_answered: null,
        num_question_answered_correctly: null,
        total_questions: 3,
      },
    },
  ])('$name', ({ contentId, initialProgress, update, expectedCounts }) => {
    setContentNodeProgress({ content_id: contentId, progress: initialProgress, ...initialCounts });
    setContentNodeProgress({ content_id: contentId, ...update });

    expect(contentNodeProgressMetaDataMap[contentId]).toEqual(expectedCounts);
    expect(contentNodeProgressMap[contentId]).toBe(0.5);
  });
});
