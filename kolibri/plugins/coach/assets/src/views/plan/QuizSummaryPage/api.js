import map from 'lodash/map';
import { fetchNodeDataAndConvertExam } from 'kolibri.utils.exams';
import { ExamResource, ContentNodeResource } from 'kolibri.resources';

export function fetchQuizSummaryPageData(examId) {
  const payload = {
    // To display the title, status, etc. of the Quiz
    exam: {},
    // To render the exercises in QuestionListPreview > ContentRenderer
    exerciseContentNodes: {},
  };
  return ExamResource.fetchModel({ id: examId })
    .then(exam => {
      return fetchNodeDataAndConvertExam(exam);
    })
    .then(exam => {
      payload.exam = exam;
      return ContentNodeResource.fetchCollection({
        getParams: {
          ids: map(exam.question_sources, 'exercise_id'),
        },
      }).then(contentNodes => {
        payload.exerciseContentNodes = contentNodes;
        return payload;
      });
    });
}

export function serverAssignmentPayload(listOfIDs, classId) {
  const assignedToClass = listOfIDs.length === 0 || listOfIDs[0] === classId;
  if (assignedToClass) {
    return [{ collection: classId }];
  }
  return listOfIDs.map(id => {
    return { collection: id };
  });
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
