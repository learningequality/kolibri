import { ExamAttemptLogResource, ExamLogResource } from 'kolibri.resources';
import router from 'kolibri.coreVue.router';
import { now } from 'kolibri.utils.serverClock';
import { ClassesPageNames } from '../../constants';
import { LearnerClassroomResource } from '../../apiResources';
import { calcQuestionsAnswered } from './utils';

function setExamAttemptLog(store, { contentId, itemId, attemptLog }) {
  store.commit(
    'SET_EXAM_ATTEMPT_LOGS',
    {
      [contentId]: {
        [itemId]: attemptLog,
      },
    },
    { root: true }
  );
}

export function setAndSaveCurrentExamAttemptLog(
  store,
  { contentId, itemId, currentAttemptLog, examId }
) {
  // Clear the learner classroom cache here as its progress data is now
  // stale
  LearnerClassroomResource.clearCache();
  setExamAttemptLog(store, { contentId, itemId, attemptLog: currentAttemptLog });

  // If a save has already been fired for this particular attempt log,
  // it may not have an id yet, so we can look for it by its uniquely
  // identifying fields, contentId and itemId.
  let examAttemptLogModel = ExamAttemptLogResource.findModel({
    content_id: contentId,
    item: itemId,
  });
  const attributes = {
    ...currentAttemptLog,
    user: store.rootGetters.currentUserId,
    examlog: store.rootState.examLog.id,
  };
  // If the above findModel returned no matching model, then we can do
  // getModel to get the new model instead.
  if (!examAttemptLogModel) {
    examAttemptLogModel = ExamAttemptLogResource.createModel(attributes);
  }
  return examAttemptLogModel.save(attributes).then(
    newExamAttemptLog =>
      new Promise(resolve => {
        setExamAttemptLog(store, { contentId, itemId, attemptLog: { ...newExamAttemptLog } });
        store.commit(
          'SET_QUESTIONS_ANSWERED',
          calcQuestionsAnswered(store.rootState.examAttemptLogs)
        );
        // Add this attempt log to the Collection for future caching.
        const examAttemptLogCollection = ExamAttemptLogResource.getCollection({
          user: store.getters.currentUserId,
          exam: examId,
        });
        examAttemptLogCollection.set(examAttemptLogModel);
        resolve();
      }),
    () => {
      router.replace({ name: ClassesPageNames.CLASS_ASSIGNMENTS });
    }
  );
}

export function closeExam(store) {
  const { examLog } = store.rootState;
  return ExamLogResource.saveModel({
    id: examLog.id,
    data: {
      ...examLog,
      completion_timestamp: now(),
      closed: true,
    },
  })
    .then(() => {
      LearnerClassroomResource.clearCache();
    })
    .catch(error => {
      store.dispatch('handleApiError', error, { root: true });
    });
}
