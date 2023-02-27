import get from 'lodash/get';
import pickBy from 'lodash/pickBy';
import Modalities from 'kolibri-constants/Modalities';
import { ContentNodeResource, ExamResource } from 'kolibri.resources';
import { fetchNodeDataAndConvertExam } from 'kolibri.utils.exams';
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
    }).then(fetchNodeDataAndConvertExam);
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
    true
  );

  return Promise.all([itemPromise, difficultiesPromise]).then(([item, stats]) => {
    if (quizId) {
      store.commit('SET_STATE', { exam: item });
      // If no one attempted one of the questions, it could get missed out of the list
      // of difficult questions, so use the exam data to fill in the blanks here.
      stats = item.question_sources.map(source => {
        const stat = stats.find(stat => stat.item === source.item) || {
          correct: 0,
          total: (stats[0] || {}).total || 0,
        };
        const title = coachStrings.$tr('nthExerciseName', {
          name: source.title,
          number: source.counter_in_exercise,
        });
        return {
          ...stat,
          ...source,
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
            item.assessmentmetadata.assessment_item_ids.indexOf(stat.item)
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
