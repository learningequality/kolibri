import {
  ChannelResource,
  LearnerGroupResource,
  ContentNodeResource,
  ExamResource,
  ExamLogResource,
  FacilityUserResource,
} from 'kolibri.resources';
import ConditionalPromise from 'kolibri.lib.conditionalPromise';
import router from 'kolibri.coreVue.router';
import {
  handleError,
  handleApiError,
  createSnackbar,
  samePageCheckGenerator,
} from 'kolibri.coreVue.vuex.actions';
import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
import { PageNames } from '../../constants';
import { setClassState } from './main';
import { getExamReport } from 'kolibri.utils.exams';
import { assessmentMetaDataState } from 'kolibri.coreVue.vuex.mappers';
import { createTranslator } from 'kolibri.utils.i18n';

const translator = createTranslator('coachExamPageTitles', {
  coachExamListPageTitle: 'Exams',
  coachExamCreationPageTitle: 'Create new exam',
  coachExamReportDetailPageTitle: 'Exam Report Detail',
  examReportTitle: '{examTitle} report',
});

const allChannels = createTranslator('allChannels', {
  allChannels: 'All channels',
}).$tr('allChannels');

function _breadcrumbState(topic) {
  return {
    id: topic.pk,
    title: topic.title,
  };
}

function _breadcrumbsState(topics) {
  return topics.map(topic => _breadcrumbState(topic));
}

function _currentTopicState(topic, ancestors = []) {
  let breadcrumbs = Array.from(ancestors);
  breadcrumbs.push({ pk: topic.pk, title: topic.title });
  breadcrumbs.unshift({ pk: null, title: allChannels });
  breadcrumbs = _breadcrumbsState(breadcrumbs);
  return {
    id: topic.pk,
    title: topic.title,
    breadcrumbs,
  };
}

function _topicState(topic) {
  return {
    id: topic.pk,
    title: topic.title,
  };
}

function _topicsState(topics) {
  return topics.map(topic => _topicState(topic));
}

function _exerciseState(exercise) {
  const numAssessments = assessmentMetaDataState(exercise).assessmentIds.length;
  return {
    id: exercise.pk,
    title: exercise.title,
    numAssessments,
  };
}

function _exercisesState(exercises) {
  return exercises.map(exercise => _exerciseState(exercise));
}

function _examState(exam) {
  return {
    id: exam.id,
    title: exam.title,
    channelId: exam.channel_id,
    collection: exam.collection,
    active: exam.active,
    archive: exam.archive,
    questionCount: exam.question_count,
    questionSources: exam.question_sources,
    seed: exam.seed,
    assignments: exam.assignments,
  };
}

function _examsState(exams) {
  return exams.map(exam => _examState(exam));
}

export function _createExam(store, exam) {
  return new Promise((resolve, reject) => {
    ExamResource.createModel(exam)
      .save()
      .then(exam => resolve(exam), error => reject(error));
  });
}

/**
 * EXAMS PAGE
 */

export function showExamsPage(store, classId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.EXAMS);

  const promises = [
    ExamResource.getCollection({ collection: classId }).fetch({}, true),
    setClassState(store, classId),
  ];

  return ConditionalPromise.all(promises).only(
    samePageCheckGenerator(store),
    ([exams]) => {
      const pageState = {
        exams: _examsState(exams),
        examsModalSet: false,
        busy: false,
      };

      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_ERROR', null);
      store.dispatch('CORE_SET_TITLE', translator.$tr('coachExamListPageTitle'));
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    },
    error => handleError(store, error)
  );
}

export function setExamsModal(store, modalName) {
  store.dispatch('SET_EXAMS_MODAL', modalName);
}

export function activateExam(store, examId) {
  return ExamResource.getModel(examId)
    .save({ active: true })
    .then(
      () => {
        const exams = store.state.pageState.exams;
        const examIndex = exams.findIndex(exam => exam.id === examId);
        exams[examIndex].active = true;

        store.dispatch('SET_EXAMS', exams);
        setExamsModal(store, false);

        createSnackbar(store, {
          text: createTranslator('examActivateSnackbar', {
            examIsNowActive: 'Exam is now active',
          }).$tr('examIsNowActive'),
          autoDismiss: true,
        });
      },
      error => handleError(store, error)
    );
}

export function deactivateExam(store, examId) {
  return ExamResource.getModel(examId)
    .save({ active: false })
    .then(
      () => {
        const exams = store.state.pageState.exams;
        const examIndex = exams.findIndex(exam => exam.id === examId);
        exams[examIndex].active = false;

        store.dispatch('SET_EXAMS', exams);
        setExamsModal(store, false);

        createSnackbar(store, {
          text: createTranslator('examDeactivateSnackbar', {
            examIsNowInactive: 'Exam is now inactive',
          }).$tr('examIsNowInactive'),
          autoDismiss: true,
        });
      },
      error => handleError(store, error)
    );
}

export function copyExam(store, exam, className) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  _createExam(store, exam).then(
    () => {
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      setExamsModal(store, false);
      createSnackbar(store, {
        text: createTranslator('copyExam', {
          copiedExamToClass: 'Copied exam to { className }',
        }).$tr('copiedExamToClass', { className }),
        autoDismiss: true,
      });
    },
    error => handleApiError(store, error)
  );
}

export function updateExamDetails(store, examId, payload) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  return new Promise((resolve, reject) => {
    ExamResource.getModel(examId)
      .save(payload)
      .then(
        exam => {
          const exams = store.state.pageState.exams;
          const examIndex = exams.findIndex(exam => exam.id === examId);
          exams[examIndex] = _examState(exam);

          store.dispatch('SET_EXAMS', exams);
          setExamsModal(store, false);
          createSnackbar(store, {
            text: createTranslator('editExamDetailsSnackbar', {
              changesToExamSaved: 'Changes to exam saved',
            }).$tr('changesToExamSaved'),
            autoDismiss: true,
          });
          store.dispatch('CORE_SET_PAGE_LOADING', false);
          resolve();
        },
        error => {
          store.dispatch('CORE_SET_PAGE_LOADING', false);
          reject(error);
        }
      );
  });
}

export function deleteExam(store, examId) {
  return ExamResource.getModel(examId)
    .delete()
    .then(
      () => {
        const exams = store.state.pageState.exams;
        const updatedExams = exams.filter(exam => exam.id !== examId);
        store.dispatch('SET_EXAMS', updatedExams);

        router.replace({ name: PageNames.EXAMS });
        createSnackbar(store, {
          text: createTranslator('examDeleted', {
            examDeleted: 'Exam deleted',
          }).$tr('examDeleted'),
          autoDismiss: true,
        });
        setExamsModal(store, false);
      },
      error => handleError(store, error)
    );
}

export function previewExam(store) {
  setExamsModal(store, false);
}

/**
 * EXAM CREATION
 */

export function showCreateExamPage(store, classId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.CREATE_EXAM);
  store.dispatch('CORE_SET_TITLE', translator.$tr('coachExamCreationPageTitle'));
  store.dispatch('SET_PAGE_STATE', {
    topic: {},
    subtopics: [],
    exercises: [],
    selectedExercises: [],
    examsModalSet: false,
  });

  const examsPromise = ExamResource.getCollection({
    collection: classId,
  }).fetch({}, true);
  const goToTopLevelPromise = goToTopLevel(store);

  ConditionalPromise.all([examsPromise, setClassState(store, classId), goToTopLevelPromise]).only(
    samePageCheckGenerator(store),
    ([exams]) => {
      store.dispatch('SET_EXAMS', exams);
      store.dispatch('CORE_SET_ERROR', null);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    },
    error => handleError(store, error)
  );
}

// TODO: Optimize
export function goToTopLevel(store) {
  return new Promise((resolve, reject) => {
    const channelPromise = ChannelResource.getCollection({
      available: true,
      has_exercise: true,
    }).fetch();

    ConditionalPromise.all([channelPromise]).only(
      samePageCheckGenerator(store),
      ([channelsCollection]) => {
        const fetchTopicPromises = channelsCollection.map(channel =>
          fetchTopic(store, channel.root)
        );
        ConditionalPromise.all(fetchTopicPromises).only(
          samePageCheckGenerator(store),
          channelsContent => {
            const subtopics = channelsContent.map(channel => {
              const subtopic = channel.topic;
              subtopic.allExercisesWithinTopic = channel.subtopics.reduce(
                (acc, subtopic) => acc.concat(subtopic.allExercisesWithinTopic),
                channel.exercises
              );
              return subtopic;
            });

            const topic = {
              allExercisesWithinTopic: subtopics.reduce(
                (acc, subtopic) => acc.concat(subtopic.allExercisesWithinTopic),
                []
              ),
              id: null,
              title: allChannels,
            };
            store.dispatch('SET_TOPIC', topic);
            store.dispatch('SET_SUBTOPICS', subtopics);
            store.dispatch('SET_EXERCISES', []);
            resolve();
          },
          error => reject(error)
        );
      },
      error => reject(error)
    );
  });
}

export function getAllExercisesWithinTopic(store, topicId) {
  return new Promise((resolve, reject) => {
    const exercisesPromise = ContentNodeResource.getDescendantsCollection(topicId, {
      descendant_kind: ContentNodeKinds.EXERCISE,
      fields: ['pk', 'title', 'assessmentmetadata'],
    }).fetch();

    ConditionalPromise.all([exercisesPromise]).only(
      samePageCheckGenerator(store),
      ([exercisesCollection]) => {
        const exercises = _exercisesState(exercisesCollection);
        resolve(exercises);
      },
      error => reject(error)
    );
  });
}

// fetches topic, it's children subtopics, and children exercises
// TODO: Optimize
function fetchTopic(store, topicId) {
  return new Promise((resolve, reject) => {
    const topicPromise = ContentNodeResource.getModel(topicId).fetch();
    const ancestorsPromise = ContentNodeResource.fetchAncestors(topicId);
    const subtopicsPromise = ContentNodeResource.getCollection({
      parent: topicId,
      kind: ContentNodeKinds.TOPIC,
      fields: ['pk', 'title', 'ancestors'],
    }).fetch();
    const exercisesPromise = ContentNodeResource.getCollection({
      parent: topicId,
      kind: ContentNodeKinds.EXERCISE,
      fields: ['pk', 'title', 'assessmentmetadata'],
    }).fetch();

    ConditionalPromise.all([
      topicPromise,
      subtopicsPromise,
      exercisesPromise,
      ancestorsPromise,
    ]).only(
      samePageCheckGenerator(store),
      ([topicModel, subtopicsCollection, exercisesCollection, ancestors]) => {
        const topic = _currentTopicState(topicModel, ancestors);
        const exercises = _exercisesState(exercisesCollection);
        let subtopics = _topicsState(subtopicsCollection);

        const subtopicsExercisesPromises = subtopics.map(subtopic =>
          getAllExercisesWithinTopic(store, subtopic.id)
        );

        ConditionalPromise.all(subtopicsExercisesPromises).only(
          samePageCheckGenerator(store),
          subtopicsExercises => {
            subtopics = subtopics.map((subtopic, index) => {
              subtopic.allExercisesWithinTopic = subtopicsExercises[index];
              return subtopic;
            });

            resolve({ topic, subtopics, exercises });
          },
          error => reject(error)
        );
      },
      error => reject(error)
    );
  });
}

export function goToTopic(store, topicId) {
  return new Promise((resolve, reject) => {
    fetchTopic(store, topicId).then(
      content => {
        store.dispatch('SET_TOPIC', content.topic);
        store.dispatch('SET_SUBTOPICS', content.subtopics);
        store.dispatch('SET_EXERCISES', content.exercises);
        resolve();
      },
      error => reject(error)
    );
  });
}

export function addExercise(store, exercise) {
  const selectedExercises = store.state.pageState.selectedExercises;
  if (!selectedExercises.some(selectedExercise => selectedExercise.id === exercise.id)) {
    setSelectedExercises(store, selectedExercises.concat(exercise));
  }
}

export function removeExercise(store, exercise) {
  let selectedExercises = store.state.pageState.selectedExercises;
  selectedExercises = selectedExercises.filter(
    selectedExercise => selectedExercise.id !== exercise.id
  );
  setSelectedExercises(store, selectedExercises);
}

export function setSelectedExercises(store, selectedExercises) {
  store.dispatch('SET_SELECTED_EXERCISES', selectedExercises);
}

export function createExamAndRoute(store, exam) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  _createExam(store, exam).then(
    () => {
      router.getInstance().push({ name: PageNames.EXAMS });
      createSnackbar(store, {
        text: createTranslator('newExamCreated', {
          newExamCreated: 'New exam created',
        }).$tr('newExamCreated'),
        autoDismiss: true,
      });
    },
    error => handleApiError(store, error)
  );
}

/**
 * EXAM REPORTS
 */

export function showExamReportPage(store, classId, examId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.EXAM_REPORT);

  const examPromise = ExamResource.getModel(examId).fetch();
  ConditionalPromise.all([examPromise]).only(
    samePageCheckGenerator(store),
    ([exam]) => {
      const examLogPromise = ExamLogResource.getCollection({
        exam: examId,
        collection: classId,
      }).fetch();
      const facilityUserPromise = FacilityUserResource.getCollection({
        member_of: classId,
      }).fetch();
      const groupPromise = LearnerGroupResource.getCollection({
        parent: classId,
      }).fetch();
      const examsPromise = ExamResource.getCollection({
        collection: classId,
      }).fetch({}, true);
      ConditionalPromise.all([
        examLogPromise,
        facilityUserPromise,
        groupPromise,
        examsPromise,
        setClassState(store, classId),
      ]).only(
        samePageCheckGenerator(store),
        ([examLogs, facilityUsers, learnerGroups, exams]) => {
          const examTakers = facilityUsers.map(user => {
            const examTakenByUser =
              examLogs.find(examLog => String(examLog.user) === user.id) || {};
            const learnerGroup =
              learnerGroups.find(group => group.user_ids.indexOf(user.id) > -1) || {};
            return {
              id: user.id,
              name: user.full_name,
              group: learnerGroup,
              score: examTakenByUser.score,
              progress: examTakenByUser.progress,
              closed: examTakenByUser.closed,
            };
          });
          store.dispatch('SET_PAGE_STATE', {
            examTakers,
            exam,
            examsModalSet: null,
            exams,
            learnerGroups,
          });
          store.dispatch('CORE_SET_ERROR', null);
          store.dispatch('CORE_SET_TITLE', exam.title);
          store.dispatch('CORE_SET_PAGE_LOADING', false);
        },
        error => {
          handleApiError(store, error);
        }
      );
    },
    error => {
      if (error.status.code === 404) {
        // TODO: route to 404 page
        router.replace({ name: PageNames.EXAMS });
      } else {
        handleApiError(store, error);
      }
    }
  );
}

/**
 * EXAM REPORT DETAILS
 */

export function showExamReportDetailPage(
  store,
  classId,
  userId,
  examId,
  questionNumber,
  interactionIndex
) {
  // idk what this is for
  if (store.state.pageName !== PageNames.EXAM_REPORT_DETAIL) {
    store.dispatch('CORE_SET_PAGE_LOADING', true);
    store.dispatch('SET_PAGE_NAME', PageNames.EXAM_REPORT_DETAIL);
  }
  const examReportPromise = getExamReport(store, examId, userId, questionNumber, interactionIndex);
  const setClassStatePromise = setClassState(store, classId);
  ConditionalPromise.all([examReportPromise, setClassStatePromise]).then(
    ([examReport]) => {
      store.dispatch('SET_PAGE_STATE', examReport);
      store.dispatch('SET_TOOLBAR_ROUTE', { name: PageNames.EXAM_REPORT });
      store.dispatch('CORE_SET_ERROR', null);
      store.dispatch('CORE_SET_TITLE', translator.$tr('coachExamReportDetailPageTitle'));
      store.dispatch(
        'SET_TOOLBAR_TITLE',
        translator.$tr('examReportTitle', {
          examTitle: examReport.exam.title,
        })
      );
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    },
    () =>
      router.replace({
        name: PageNames.EXAM_REPORT,
        params: { classId, examId },
      })
  );
}
