import ExamResource from 'kolibri-common/apiResources/ExamResource';
import samePageCheckGenerator from 'kolibri-common/utils/samePageCheckGenerator';
import { fetchExamWithContent } from 'kolibri-common/quizzes/utils';
import shuffled from 'kolibri-common/utils/shuffled';
import useUser from 'kolibri/composables/useUser';
import { handleApiError, handleError, clearError } from 'kolibri/utils/appError';
import { get } from '@vueuse/core';
import { pageLoading } from 'kolibri-common/composables/usePageLoading';
import { ClassesPageNames } from '../../constants';
import { LearnerClassroomResource } from '../../apiResources';

export function showExam(store, params, alreadyOnQuiz, route) {
  const questionNumber = Number(params.questionNumber);
  const { classId, examId } = params;
  if (!alreadyOnQuiz) {
    pageLoading.value = true;
  }
  store.commit('SET_PAGE_NAME', ClassesPageNames.EXAM_VIEWER);

  const { currentUserId } = useUser();

  if (!get(currentUserId)) {
    handleError('You must be logged in as a learner to view this page');
    pageLoading.value = false;
  } else {
    const promises = [
      LearnerClassroomResource.fetchModel({ id: classId }),
      ExamResource.fetchModel({ id: examId }),
    ];
    const shouldResolve = samePageCheckGenerator(route);
    Promise.all(promises).then(
      ([classroom, exam]) => {
        if (shouldResolve()) {
          store.commit('classAssignments/SET_CURRENT_CLASSROOM', classroom);
          (fetchExamWithContent(exam).then(({ exam: converted, exercises: contentNodes }) => {
            if (shouldResolve()) {
              let { question_sources } = converted;

              // When necessary, randomize the questions for the learner.
              // Seed based on the user ID so they see a consistent order each time.
              for (const section of question_sources) {
                if (!section.learners_see_fixed_order) {
                  section.questions = shuffled(section.questions, get(currentUserId));
                }
              }
              // When necessary randomize the order of the sections
              // Seed based on the user ID so they see a consistent order each time.
              if (!converted.learners_see_fixed_order) {
                question_sources = shuffled(question_sources, get(currentUserId));
              }
              // If necessary, convert the question source info
              const allQuestions = question_sources.reduce((acc, section) => {
                acc = [...acc, ...section.questions];
                return acc;
              }, []);

              // Exam is drawing solely on malformed exercise data, best to quit now
              if (allQuestions.some(question => !question.item)) {
                pageLoading.value = false;
                handleError(
                  `This quiz cannot be displayed:\nQuestion sources: ${JSON.stringify(
                    allQuestions,
                  )}\nExam: ${JSON.stringify(exam)}`,
                );
                return;
              }
              // Illegal question number!
              else if (questionNumber >= allQuestions.length) {
                pageLoading.value = false;
                handleError(`Question number ${questionNumber} is not valid for this quiz`);
                return;
              }

              const contentNodeMap = {};

              for (const node of contentNodes) {
                contentNodeMap[node.id] = node;
              }

              for (const question of allQuestions) {
                question.missing = !contentNodeMap[question.exercise_id];
              }
              exam.question_sources = question_sources;
              store.commit('examViewer/SET_STATE', {
                contentNodeMap,
                exam,
                questionNumber,
                questions: allQuestions,
              });
              pageLoading.value = false;
              clearError();
            }
          }),
            error => {
              pageLoading.value = false;
              shouldResolve() ? handleApiError({ error, reloadOnReconnect: true }) : null;
            });
        }
      },
      error => {
        pageLoading.value = false;
        shouldResolve() ? handleApiError({ error, reloadOnReconnect: true }) : null;
      },
    );
  }
}
