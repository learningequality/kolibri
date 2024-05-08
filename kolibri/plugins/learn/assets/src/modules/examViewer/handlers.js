import { ExamResource } from 'kolibri.resources';
import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
import { fetchExamWithContent } from 'kolibri.utils.exams';
import shuffled from 'kolibri.utils.shuffled';
import { ClassesPageNames } from '../../constants';
import { LearnerClassroomResource } from '../../apiResources';

export function showExam(store, params, alreadyOnQuiz) {
  const questionNumber = Number(params.questionNumber);
  const { classId, examId } = params;
  if (!alreadyOnQuiz) {
    store.commit('CORE_SET_PAGE_LOADING', true);
  }
  store.commit('SET_PAGE_NAME', ClassesPageNames.EXAM_VIEWER);

  const userId = store.getters.currentUserId;

  if (!userId) {
    store.commit('CORE_SET_ERROR', 'You must be logged in as a learner to view this page');
    store.commit('CORE_SET_PAGE_LOADING', false);
  } else {
    const promises = [
      LearnerClassroomResource.fetchModel({ id: classId }),
      ExamResource.fetchModel({ id: examId }),
    ];
    const shouldResolve = samePageCheckGenerator(store);
    Promise.all(promises).then(
      ([classroom, exam]) => {
        if (shouldResolve()) {
          store.commit('classAssignments/SET_CURRENT_CLASSROOM', classroom);
          fetchExamWithContent(exam).then(({ exam: converted, exercises: contentNodes }) => {
            if (shouldResolve()) {
              const { question_sources } = converted;

              // When necessary, randomize the questions for the learner.
              // Seed based on the user ID so they see a consistent order each time.
              question_sources.forEach(section => {
                if (!section.learners_see_fixed_order) {
                  section.questions = shuffled(section.questions, store.state.core.session.user_id);
                }
              });
              // If necessary, convert the question source info
              const allQuestions = question_sources.reduce((acc, section) => {
                acc = [...acc, ...section.questions];
                return acc;
              }, []);

              // Exam is drawing solely on malformed exercise data, best to quit now
              if (allQuestions.some(question => !question.question_id)) {
                store.dispatch(
                  'handleError',
                  `This quiz cannot be displayed:\nQuestion sources: ${JSON.stringify(
                    allQuestions
                  )}\nExam: ${JSON.stringify(exam)}`
                );
                return;
              }
              // Illegal question number!
              else if (questionNumber >= allQuestions.length) {
                store.dispatch(
                  'handleError',
                  `Question number ${questionNumber} is not valid for this quiz`
                );
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
              store.commit('CORE_SET_PAGE_LOADING', false);
              store.commit('CORE_SET_ERROR', null);
            }
          }),
            error => {
              shouldResolve()
                ? store.dispatch('handleApiError', { error, reloadOnReconnect: true })
                : null;
            };
        }
      },
      error => {
        shouldResolve()
          ? store.dispatch('handleApiError', { error, reloadOnReconnect: true })
          : null;
      }
    );
  }
}
