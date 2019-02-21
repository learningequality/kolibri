import { ContentNodeResource, ExamResource } from 'kolibri.resources';
import { assessmentMetaDataState } from 'kolibri.coreVue.vuex.mappers';
import { fetchNodeDataAndConvertExam } from 'kolibri.utils.exams';
import ExerciseDifficulties from './../../apiResources/exerciseDifficulties';
import QuizDifficulties from './../../apiResources/quizDifficulties';

export function setItemStats(store, { classId, exerciseId, quizId, lessonId, groupId }) {
  let resource = ExerciseDifficulties;
  const getParams = {
    classroom_id: classId,
  };
  const promises = [];
  const pk = exerciseId || quizId;
  if (quizId) {
    resource = QuizDifficulties;
    promises.push(
      ExamResource.fetchModel({
        id: quizId,
      }).then(fetchNodeDataAndConvertExam)
    );
  } else {
    promises.push(
      ContentNodeResource.fetchModel({
        id: store.rootState.classSummary.contentMap[exerciseId].node_id,
      })
    );
  }
  if (lessonId) {
    getParams.lesson_id = lessonId;
  }
  if (groupId) {
    getParams.group_id = groupId;
  }

  promises.push(resource.fetchDetailCollection('detail', pk, getParams, true));
  return Promise.all(promises).then(([item, stats]) => {
    if (quizId) {
      store.commit('SET_STATE', { exam: item });
      // If no one attempted one of the questions, it could get missed out of the list
      // of difficult questions, so use the exam data to fill in the blanks here.
      stats = item.question_sources.map(source => {
        const stat = stats.find(
          stat => stat.item === source.question_id && stat.content_id === source.exercise_id
        ) || {
          correct: 0,
          total: (stats[0] || {}).total || 0,
        };
        return {
          ...stat,
          ...source,
        };
      });
    } else {
      item.assessmentmetadata = assessmentMetaDataState(item);
      store.commit('SET_STATE', { exercise: item });
      stats = stats.map(stat => ({
        ...stat,
        exercise_id: exerciseId,
        question_id: stat.item,
      }));
    }

    // Set the ItemStat data
    store.commit('SET_ITEMSTATS', stats);
    return stats;
  });
}
