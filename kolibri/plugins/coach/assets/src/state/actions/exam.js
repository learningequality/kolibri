const CoreApp = require('kolibri');
const pick = require('lodash/fp/pick');
const ConditionalPromise = require('kolibri.lib.conditionalPromise');
const router = require('kolibri.coreVue.router');
const CoreActions = require('kolibri.coreVue.vuex.actions');
const ContentNodeKinds = require('kolibri.coreVue.vuex.constants').ContentNodeKinds;
const Constants = require('../../constants');

const ClassroomResource = CoreApp.resources.ClassroomResource;
const ChannelResource = CoreApp.resources.ChannelResource;
const LearnerGroupResource = CoreApp.resources.LearnerGroupResource;
const ContentNodeResource = CoreApp.resources.ContentNodeResource;
const ExamResource = CoreApp.resources.ExamResource;

const pickIdAndName = pick(['id', 'name']);

function _channelState(channel) {
  return {
    id: channel.id,
    name: channel.name,
    rootPk: channel.root_pk,
  };
}

function _channelsState(channels) {
  return channels.map(channel => _channelState(channel));
}

function _breadcrumbState(topic) {
  return {
    id: topic.pk,
    title: topic.title,
  };
}


function _breadcrumbsState(topics) {
  return topics.map(topic => _breadcrumbState(topic));
}

function _currentTopicState(topic) {
  let breadcrumbs = Array.from(topic.ancestors);
  breadcrumbs.push({ pk: topic.pk, title: topic.title });
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
  return {
    id: exercise.pk,
    title: exercise.title,
  };
}

function _exercisesState(exercises) {
  return exercises.map(exercise => _exerciseState(exercise));
}


function displayModal(store, modalName) {
  store.dispatch('SET_MODAL', modalName);
}

function showExamsPage(store, classId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.EXAMS);

  const resourceRequests = [
    ClassroomResource.getModel(classId).fetch(),
    LearnerGroupResource.getCollection({ parent: classId }).fetch(),
    ChannelResource.getCollection().fetch(),
    ExamResource.getCollection({ collection: classId }).fetch({}, true),
  ];

  return ConditionalPromise.all(resourceRequests).only(
    CoreActions.samePageCheckGenerator(store),
    ([classroom, learnerGroups, channels, exams]) => {
      const pageState = {
        channels: _channelsState(channels),
        classId,
        currentClass: pickIdAndName(classroom),
        currentClassGroups: learnerGroups.map(pickIdAndName),
        exams: exams.map(exam => Object.assign(exam, { visibility: { class: true } })),
        modalShown: false,
      };

      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_ERROR', null);
      store.dispatch('CORE_SET_TITLE', Constants.PageTitles.EXAMS);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    },
    error => {
      CoreActions.handleError(store, error);
    }
  );
}

function getAllExercisesWithinTopic(store, channelId, topicId) {
  return new Promise((resolve, reject) => {
    const exercisesPromise = ContentNodeResource.getDescendantsCollection(
      topicId,
      { channel_id: channelId },
      { descendant_kind: ContentNodeKinds.EXERCISE, fields: ['pk'] }
    ).fetch();

    ConditionalPromise.all([exercisesPromise]).only(
      CoreActions.samePageCheckGenerator(store),
      ([exercisesCollection]) => {
        const exercises = _exercisesState(exercisesCollection);
        const exerciseIds = exercises.map(exercise => exercise.id);
        resolve(exerciseIds);
      },
      error => reject(error)
    );
  });
}

// fetches topic, it's children subtopics, and children exercises
function fetchContent(store, channelId, topicId) {
  return new Promise((resolve, reject) => {
    const channelPayload = { channel_id: channelId };
    const topicPromise = ContentNodeResource.getModel(topicId, channelPayload).fetch();
    const subtopicsPromise = ContentNodeResource.getCollection(
      channelPayload, { parent: topicId, kind: ContentNodeKinds.TOPIC, fields: ['pk', 'title', 'ancestors'] }).fetch();
    const exercisesPromise = ContentNodeResource.getCollection(
      channelPayload, { parent: topicId, kind: ContentNodeKinds.EXERCISE, fields: ['pk', 'title'] }).fetch();

    ConditionalPromise.all([topicPromise, subtopicsPromise, exercisesPromise]).only(
      CoreActions.samePageCheckGenerator(store),
      ([topicModel, subtopicsCollection, exercisesCollection]) => {
        const topic = _currentTopicState(topicModel);
        const exercises = _exercisesState(exercisesCollection);
        let subtopics = _topicsState(subtopicsCollection);

        const subtopicsExercisesPromises = subtopics.map(
          subtopic => getAllExercisesWithinTopic(store, channelId, subtopic.id));

        ConditionalPromise.all(subtopicsExercisesPromises).only(
          CoreActions.samePageCheckGenerator(store),
          subtopicsExercises => {
            subtopics = subtopics.map((subtopic, index) => {
              subtopic.allExercisesWithinTopic = subtopicsExercises[index];
              return subtopic;
            });

            store.dispatch('SET_TOPIC', topic);
            store.dispatch('SET_SUBTOPICS', subtopics);
            store.dispatch('SET_EXERCISES', exercises);
            resolve({ topic, subtopics, exercises });
          },
          error => reject(error)
        );
      },
      error => reject(error)
    );
  });
}


function showCreateExamPage(store, classId, channelId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.CREATE_EXAM);
  store.dispatch('CORE_SET_TITLE', Constants.PageTitles.CREATE_EXAM);

  const currentClassPromise = ClassroomResource.getModel(classId).fetch();
  const channelPromise = ChannelResource.getCollection().fetch();

  ConditionalPromise.all([currentClassPromise, channelPromise]).only(
    CoreActions.samePageCheckGenerator(store),
    ([currentClassModel, channelsCollection]) => {
      const currentClass = pickIdAndName(currentClassModel);
      const currentChannel = _channelState(
        channelsCollection.find(channel => channel.id === channelId));

      const fetchContentPromise = fetchContent(store, channelId, currentChannel.rootPk);

      ConditionalPromise.all([fetchContentPromise]).only(
        CoreActions.samePageCheckGenerator(store),
        ([content]) => {
          const pageState = {
            currentClass,
            currentChannel,
            topic: content.topic,
            subtopics: content.subtopics,
            exercises: content.exercises,
            selectedExercises: [],
            modalShown: false,
          };

          store.dispatch('SET_PAGE_STATE', pageState);
          store.dispatch('CORE_SET_ERROR', null);
          store.dispatch('CORE_SET_PAGE_LOADING', false);
        },
        error => {
          CoreActions.handleError(store, error);
        }
      );
    },
    error => {
      CoreActions.handleError(store, error);
    }
  );
}

function addExercise(store, exerciseId) {
  const selectedExercises = store.state.pageState.selectedExercises;
  if (!selectedExercises.includes(exerciseId)) {
    store.dispatch('SET_SELECTED_EXERCISES', selectedExercises.concat(exerciseId));
  }
}

function removeExercise(store, exerciseId) {
  const selectedExercises = store.state.pageState.selectedExercises;
  const index = selectedExercises.indexOf(exerciseId);
  if (index !== -1) {
    selectedExercises.splice(index, 1);
    store.dispatch('SET_SELECTED_EXERCISES', selectedExercises);
  }
}

function createExam(store, examObj) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  const examPayload = {
    collection: examObj.classId,
    channel_id: examObj.channelId,
    title: examObj.title,
    question_count: examObj.numQuestions,
    question_sources: examObj.questionSources,
    seed: examObj.seed,
    active: false,
  };
  ExamResource.createModel(examPayload).save().then(
    () => {
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      router.getInstance().push({ name: Constants.PageNames.EXAMS });
    },
    error => CoreActions.handleError(store, error)
  );
}

function showExamReportPage(store, classId, examId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.EXAM_REPORT);
  store.dispatch('SET_PAGE_STATE', {});
  store.dispatch('CORE_SET_ERROR', null);
  store.dispatch('CORE_SET_TITLE', ('Exam Report'));
  store.dispatch('CORE_SET_PAGE_LOADING', false);
}

function showExamReportDetailPage(store, classId, examId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.EXAM_REPORT_DETAIL);
  store.dispatch('SET_PAGE_STATE', {});
  store.dispatch('CORE_SET_ERROR', null);
  store.dispatch('CORE_SET_TITLE', ('Exam Report Detail'));
  store.dispatch('CORE_SET_PAGE_LOADING', false);
}

function activateExam(store, examId) {
  ExamResource.getModel(examId).save({ active: true }).then(
    () => {
      const exams = store.state.pageState.exams;
      const examIndex = exams.findIndex(exam => exam.id === examId);
      exams[examIndex].active = true;

      store.dispatch('SET_EXAMS', exams);
      this.displayModal(false);
    },
    error => CoreActions.handleError(store, error)
  );
}

function deactivateExam(store, examId) {
  ExamResource.getModel(examId).save({ active: false }).then(
    () => {
      const exams = store.state.pageState.exams;
      const examIndex = exams.findIndex(exam => exam.id === examId);
      exams[examIndex].active = false;

      store.dispatch('SET_EXAMS', exams);
      this.displayModal(false);
    },
    error => CoreActions.handleError(store, error)
  );
}

function updateExamVisibility() {
  this.displayModal(false);
}

function previewExam() {
  this.displayModal(false);
}

function renameExam(store, examId, newExamTitle) {
  ExamResource.getModel(examId).save({ title: newExamTitle }).then(
    () => {
      const exams = store.state.pageState.exams;
      const examIndex = exams.findIndex(exam => exam.id === examId);
      exams[examIndex].title = newExamTitle;

      store.dispatch('SET_EXAMS', exams);
      this.displayModal(false);
    },
    error => CoreActions.handleError(store, error)
  );
}

function deleteExam(store, examId) {
  ExamResource.getModel(examId).delete().then(
    () => {
      const exams = store.state.pageState.exams;
      const updatedExams = exams.filter(exam => exam.id !== examId);

      store.dispatch('SET_EXAMS', updatedExams);
      this.displayModal(false);
    },
    error => CoreActions.handleError(store, error)
  );
}

module.exports = {
  displayModal,
  showExamsPage,
  showCreateExamPage,
  showExamReportPage,
  showExamReportDetailPage,
  activateExam,
  deactivateExam,
  previewExam,
  renameExam,
  deleteExam,
  updateExamVisibility,
  fetchContent,
  createExam,
  addExercise,
  removeExercise,
  getAllExercisesWithinTopic,
};
