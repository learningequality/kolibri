import map from 'lodash/map';
import { ExamResource, ContentNodeResource, LearnerGroupResource } from 'kolibri.resources';

export function fetchQuizSummaryPageData(examId) {
  const payload = {
    // To display the title, status, etc. of the Quiz
    exam: {},
    // To render the exercises in QuestionListPreview > ContentRenderer
    exerciseContentNodes: {},
    // To render the names in the "Visible to" row.
    // API request returns all groups in the classroom, even if not assigned to Quiz.
    learnerGroups: [],
  };
  return ExamResource.fetchModel({ id: examId }).then(exam => {
    payload.exam = exam;
    return Promise.all([
      ContentNodeResource.fetchCollection({
        getParams: {
          ids: map(exam.question_sources, 'exercise_id'),
        },
      }),
      LearnerGroupResource.fetchCollection({
        getParams: {
          parent: exam.collection,
        },
      }),
    ]).then(([contentNodes, learnerGroups]) => {
      payload.exerciseContentNodes = contentNodes;
      payload.learnerGroups = learnerGroups;
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
