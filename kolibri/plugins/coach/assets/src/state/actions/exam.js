import differenceBy from 'lodash/differenceBy';
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
import { getExamReport } from 'kolibri.utils.exams';
import { assessmentMetaDataState } from 'kolibri.coreVue.vuex.mappers';
import { createTranslator } from 'kolibri.utils.i18n';
import { PageNames } from '../../constants';
import { setClassState, handleCoachPageError } from './main';

const translator = createTranslator('coachExamPageTitles', {
  allChannels: 'All channels',
  coachExamListPageTitle: 'Exams',
  coachExamCreationPageTitle: 'Create new exam',
  coachExamReportDetailPageTitle: 'Exam Report Detail',
  examReportTitle: '{examTitle} report',
});

const snackbarTranslator = createTranslator('examPageSnackbarTexts', {
  changesToExamSaved: 'Changes to exam saved',
  copiedExamToClass: 'Copied exam to { className }',
  examDeleted: 'Exam deleted',
  examIsNowActive: 'Exam is now active',
  examIsNowInactive: 'Exam is now inactive',
  newExamCreated: 'New exam created',
});

function _currentTopicState(topic, ancestors = []) {
  return {
    id: topic.id,
    title: topic.title,
    num_coach_contents: topic.num_coach_contents,
    breadcrumbs: [
      { id: null, title: translator.$tr('allChannels') },
      ...ancestors,
      { id: topic.id, title: topic.title },
    ],
  };
}

function _exerciseState(exercise) {
  return {
    id: exercise.id,
    title: exercise.title,
    numAssessments: assessmentMetaDataState(exercise).assessmentIds.length,
    num_coach_contents: exercise.num_coach_contents,
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
      store.dispatch('SET_PAGE_STATE', {
        exams: _examsState(exams),
        examsModalSet: false,
        busy: false,
      });
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

function updateExamStatus(store, { examId, isActive }) {
  return ExamResource.getModel(examId)
    .save({ active: isActive })
    .then(
      () => {
        store.dispatch('SET_EXAM_STATUS', { examId, isActive });
        setExamsModal(store, false);
        createSnackbar(store, {
          text: snackbarTranslator.$tr(isActive ? 'examIsNowActive' : 'examIsNowInactive'),
          autoDismiss: true,
        });
      },
      error => handleError(store, error)
    );
}

export function activateExam(store, examId) {
  return updateExamStatus(store, { examId, isActive: true });
}

export function deactivateExam(store, examId) {
  return updateExamStatus(store, { examId, isActive: false });
}

export function copyExam(store, exam, className) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  _createExam(store, exam).then(
    () => {
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      setExamsModal(store, false);
      createSnackbar(store, {
        text: snackbarTranslator.$tr('copiedExamToClass', { className }),
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
            text: snackbarTranslator.$tr('changesToExamSaved'),
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
          text: snackbarTranslator.$tr('examDeleted'),
          autoDismiss: true,
        });
        setExamsModal(store, false);
      },
      error => handleError(store, error)
    );
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
    exerciseContentNodes: [],
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
              subtopic.channel = true;
              return subtopic;
            });

            const topic = {
              allExercisesWithinTopic: subtopics.reduce(
                (acc, subtopic) => acc.concat(subtopic.allExercisesWithinTopic),
                []
              ),
              id: null,
              title: translator.$tr('allChannels'),
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
      fields: ['id', 'title'],
    }).fetch();
    const assessmentNumbersPromise = ContentNodeResource.fetchDescendantsAssessments(topicId);

    ConditionalPromise.all([exercisesPromise, assessmentNumbersPromise]).only(
      samePageCheckGenerator(store),
      ([exercisesCollection, assessmentNumbers]) => {
        resolve([exercisesCollection, assessmentNumbers]);
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
      fields: ['id', 'title', 'ancestors', 'num_coach_contents'],
    }).fetch();
    const exercisesPromise = ContentNodeResource.getCollection({
      parent: topicId,
      kind: ContentNodeKinds.EXERCISE,
      fields: ['id', 'title', 'assessmentmetadata', 'num_coach_contents'],
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
        let subtopics = [...subtopicsCollection];

        const subtopicsExercisesPromises = subtopics.map(subtopic =>
          getAllExercisesWithinTopic(store, subtopic.id)
        );

        ConditionalPromise.all(subtopicsExercisesPromises).only(
          samePageCheckGenerator(store),
          subtopicsExercises => {
            subtopics = subtopics.map((subtopic, index) => {
              subtopic.allExercisesWithinTopic = subtopicsExercises[index][0];
              subtopics.numAssessments = subtopicsExercises[index][1];
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

export function addExercisesToExam(store, exercises) {
  const { selectedExercises } = store.state.pageState;
  // filter for exercises that are not yet selected
  const newExercises = differenceBy(exercises, selectedExercises, 'id');
  return setSelectedExercises(store, selectedExercises.concat(newExercises));
}

export function removeExercisesFromExam(store, exercises) {
  const { selectedExercises } = store.state.pageState;
  const newExercises = differenceBy(selectedExercises, exercises, 'id');
  return setSelectedExercises(store, newExercises);
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
  return ContentNodeResource.fetchNodeAssessments(selectedExercises.map(ex => ex.id)).then(
    number => {
      store.dispatch('SET_AVAILABLE_QUESTIONS', number);
    }
  );
}

export function createExamAndRoute(store, exam) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  _createExam(store, exam).then(
    () => {
      router.getInstance().push({ name: PageNames.EXAMS });
      createSnackbar(store, {
        text: snackbarTranslator.$tr('newExamCreated'),
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

  ConditionalPromise.all([ExamResource.getModel(examId).fetch()]).only(
    samePageCheckGenerator(store),
    ([exam]) => {
      const promises = [
        ExamLogResource.getCollection({ exam: examId, collection: classId }).fetch(),
        FacilityUserResource.getCollection({ member_of: classId }).fetch(),
        LearnerGroupResource.getCollection({ parent: classId }).fetch(),
        ExamResource.getCollection({ collection: classId }).fetch({}, true),
        ContentNodeResource.getCollection({
          ids: exam.question_sources.map(item => item.exercise_id),
          fields: ['id', 'num_coach_contents'],
        }).fetch(),
        setClassState(store, classId),
      ];
      ConditionalPromise.all(promises).only(
        samePageCheckGenerator(store),
        ([examLogs, facilityUsers, learnerGroups, exams, contentNodes]) => {
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
            exerciseContentNodes: [...contentNodes],
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
        handleCoachPageError(store, error);
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
  const promises = [
    getExamReport(store, examId, userId, questionNumber, interactionIndex),
    setClassState(store, classId),
  ];
  ConditionalPromise.all(promises).then(
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
