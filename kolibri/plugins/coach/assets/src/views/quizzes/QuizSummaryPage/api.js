import { fetchExamWithContent } from 'kolibri-common/quizzes/utils';
import ExamResource from 'kolibri-common/apiResources/ExamResource';
import QuizDifficulties from '../../../apiResources/quizDifficulties';
import { getDifficultQuestions } from '../../../utils';

const fetchDifficultQuestions = async exam => {
  if (exam.draft) {
    return [];
  }
  const correctnessStats = await QuizDifficulties.fetchDetailCollection(
    'detail',
    exam.id,
    undefined,
    true,
  );

  const allQuestions = exam.question_sources.reduce(
    (qs, section) => [...qs, ...section.questions],
    [],
  );

  allQuestions.forEach(question => {
    const questionStats = correctnessStats.find(stat => stat.item === question.item);
    if (questionStats) {
      question.correct = questionStats.correct;
      question.total = questionStats.total;
    } else {
      question.correct = 0;
      question.total = correctnessStats[0]?.total || 0;
    }
    question.questionNumber = question.counter_in_exercise;
  });

  return getDifficultQuestions(allQuestions);
};

export async function fetchQuizSummaryPageData(examId) {
  const _exam = await ExamResource.fetchModel({ id: examId });

  const { exam, exercises } = await fetchExamWithContent(_exam);

  const difficultQuestions = await fetchDifficultQuestions(exam);

  return {
    exam,
    exerciseContentNodes: exercises,
    difficultQuestions,
  };
}

export function serverAssignmentPayload(listOfIDs, classId) {
  const assignedToClass = listOfIDs.length === 0 || listOfIDs[0] === classId;
  if (assignedToClass) {
    return [classId];
  }
  return listOfIDs;
}

export function clientAssigmentState(listOfIDs, classId) {
  const assignedToClass = listOfIDs.length === 0 || listOfIDs[0] === classId;
  if (assignedToClass) {
    return [];
  }
  return listOfIDs;
}

export function deleteExam(examId) {
  return ExamResource.deleteModel({ id: examId });
}
