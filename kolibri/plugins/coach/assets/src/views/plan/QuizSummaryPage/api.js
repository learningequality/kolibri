import { fetchExamWithContent } from 'kolibri.utils.exams';
import { ExamResource } from 'kolibri.resources';

export function fetchQuizSummaryPageData(examId) {
  return ExamResource.fetchModel({ id: examId })
    .then(exam => {
      return fetchExamWithContent(exam);
    })
    .then(({ exam, exercises }) => {
      return {
        exerciseContentNodes: exercises,
        exam,
      };
    });
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
