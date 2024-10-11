import get from 'lodash/get';
import pickBy from 'lodash/pickBy';
import Modalities from 'kolibri-constants/Modalities';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import ExamResource from 'kolibri-common/apiResources/ExamResource';
import { fetchExamWithContent } from 'kolibri-common/quizzes/utils';
import { coachStrings } from '../../views/common/commonCoachStrings';
import ExerciseDifficulties from './../../apiResources/exerciseDifficulties';
import QuizDifficulties from './../../apiResources/quizDifficulties';
import PracticeQuizDifficulties from './../../apiResources/practiceQuizDifficulties';

export function setItemStats(store, { classId, exerciseId, quizId, lessonId, groupId }) {
  let itemPromise;
  let resource;
  let pk;
  let practiceQuiz;

  if (quizId) {
    pk = quizId;
    resource = QuizDifficulties;
    itemPromise = ExamResource.fetchModel({
      id: quizId,
    }).then(fetchExamWithContent);
  } else {
    pk = exerciseId;
    practiceQuiz =
      get(store.rootState.classSummary.contentMap[pk], ['options', 'modality']) === Modalities.QUIZ;
    resource = practiceQuiz ? PracticeQuizDifficulties : ExerciseDifficulties;
    itemPromise = ContentNodeResource.fetchModel({
      id: store.rootState.classSummary.contentMap[pk].node_id,
      getParams: { no_available_filtering: true },
    });
  }

  const difficultiesPromise = resource.fetchDetailCollection(
    'detail',
    pk,
    pickBy({
      classroom_id: classId,
      lesson_id: lessonId,
      group_id: groupId,
    }),
    true,
  );

  return Promise.all([itemPromise, difficultiesPromise]).then(([item, stats]) => {
    if (quizId) {
      const exam = item.exam;
      store.commit('SET_STATE', { exam });
      // If no one attempted one of the questions, it could get missed out of the list
      // of difficult questions, so use the exam data to fill in the blanks here.
      const allQuestions = exam.question_sources.reduce((qs, section) => {
        qs = [...qs, ...section.questions];
        return qs;
      }, []);
      stats = allQuestions.map(question => {
        const stat = stats.find(stat => stat.item === question.item) || {
          correct: 0,
          total: (stats[0] || {}).total || 0,
        };
        const title = coachStrings.$tr('nthExerciseName', {
          name: question.title,
          number: question.counter_in_exercise,
        });
        return {
          ...stat,
          ...question,
          title,
        };
      });
    } else {
      store.commit('SET_STATE', { exercise: item });
      if (practiceQuiz) {
        stats = item.assessmentmetadata.assessment_item_ids.map((id, questionNumber) => {
          const stat = stats.find(stat => stat.item === id) || {
            correct: 0,
            total: (stats[0] || {}).total || 0,
          };
          const title = coachStrings.$tr('nthExerciseName', {
            name: item.title,
            number: questionNumber,
          });
          return {
            ...stat,
            exercise_id: exerciseId,
            question_id: id,
            title,
          };
        });
      } else {
        stats = stats.map(stat => {
          const questionNumber = Math.max(
            1,
            item.assessmentmetadata.assessment_item_ids.indexOf(stat.item),
          );
          const title = coachStrings.$tr('nthExerciseName', {
            name: item.title,
            number: questionNumber,
          });
          return {
            ...stat,
            exercise_id: exerciseId,
            question_id: stat.item,
            title,
          };
        });
      }
    }

    // Set the ItemStat data
    store.commit('SET_ITEMSTATS', stats);
    return stats;
  });
}
