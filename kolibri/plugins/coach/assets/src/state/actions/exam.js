const CoreApp = require('kolibri');
const ConditionalPromise = require('kolibri.lib.conditionalPromise');
const CoreActions = require('kolibri.coreVue.vuex.actions');
const ContentNodeKinds = require('kolibri.coreVue.vuex.constants').ContentNodeKinds;
const Constants = require('../../constants');

const ClassroomResource = CoreApp.resources.ClassroomResource;
const ChannelResource = CoreApp.resources.ChannelResource;
const LearnerGroupResource = CoreApp.resources.LearnerGroupResource;
const ContentNodeResource = CoreApp.resources.ContentNodeResource;


function _classState(classroom) {
  return {
    id: classroom.id,
    name: classroom.name,
  };
}

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

function _groupState(group) {
  return {
    id: group.id,
    name: group.name,
  };
}

function _groupsState(groups) {
  return groups.map(group => _groupState(group));
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
  let breadcrumbs = topic.ancestors;
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
    kind: exercise.kind,
    description: exercise.description,
    thumbnail: exercise.thumbnail,
    available: exercise.available,
    files: exercise.files,
    content_id: exercise.content_id,
    author: exercise.author,
    license: exercise.license,
    license_owner: exercise.license_owner,
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

  const currentClassPromise = ClassroomResource.getModel(classId).fetch();
  const groupPromise = LearnerGroupResource.getCollection({ parent: classId }).fetch();
  const channelPromise = ChannelResource.getCollection().fetch();

  ConditionalPromise.all([currentClassPromise, groupPromise, channelPromise]).only(
    CoreActions.samePageCheckGenerator(store),
    ([currentClassModel, groupsCollection, channelsCollection]) => {
      const currentClass = _classState(currentClassModel);
      const currentClassGroups = _groupsState(groupsCollection);
      const channels = _channelsState(channelsCollection);

      const dummyExams = [{
        id: '1',
        title: 'UNIT 1 Exam',
        active: false,
        dateCreated: 'March 15, 2017 03:24:00',
        visibility: { class: false, groups: [{ id: '1', name: 'groupA' }, { id: '2', name: 'groupA' }] },
      },
      {
        id: '2',
        title: 'UNIT 1 Quiz',
        active: true,
        dateCreated: 'March 21, 2017 03:24:00',
        visibility: { class: false, groups: [{ id: '1', name: 'groupA' }] },
      },
      {
        id: '3',
        title: 'UNIT 2',
        active: true,
        dateCreated: 'March 22, 2017 03:24:00',
        visibility: { class: true, groups: [{ id: '1', name: 'groupA' }, { id: '2', name: 'groupA' }] },
      }];

      const pageState = {
        classId,
        currentClass,
        currentClassGroups,
        channels,
        exams: dummyExams,
        modalShown: false,
      };

      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_ERROR', null);
      store.dispatch('CORE_SET_TITLE', ('Exams'));
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    },
    error => {
      CoreActions.handleError(store, error);
    }
  );
}

// fetches topic, it's children subtopics, and children exercises
function fetchContent(store, channelId, topicId) {
  return new Promise((resolve, reject) => {
    const channelPayload = { channel_id: channelId };
    const topicPromise = ContentNodeResource.getModel(topicId, channelPayload).fetch();
    const subtopicsPromise = ContentNodeResource.getCollection(
      channelPayload, { parent: topicId, kind: ContentNodeKinds.TOPIC }).fetch();
    const exercisesPromise = ContentNodeResource.getCollection(
      channelPayload, { parent: topicId, kind: ContentNodeKinds.EXERCISE }).fetch();

    ConditionalPromise.all([topicPromise, subtopicsPromise, exercisesPromise]).only(
      CoreActions.samePageCheckGenerator(store),
      ([topicModel, subtopicsCollection, exercisesCollection]) => {
        // TODO: smh figure out a nicer workaround
        const topicModelCopy = JSON.parse(JSON.stringify(topicModel));
        const topic = _currentTopicState(topicModelCopy);
        const subtopics = _topicsState(subtopicsCollection);
        const exercises = _exercisesState(exercisesCollection);

        store.dispatch('SET_TOPIC', topic);
        store.dispatch('SET_SUBTOPICS', subtopics);
        store.dispatch('SET_EXERCISES', exercises);
        resolve({ topic, subtopics, exercises });
      },
      error => reject(error)
    );
  });
}

function showCreateExamPage(store, classId, channelId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.CREATE_EXAM);
  store.dispatch('CORE_SET_TITLE', ('Exams'));

  const currentClassPromise = ClassroomResource.getModel(classId).fetch();
  const channelPromise = ChannelResource.getCollection().fetch();

  ConditionalPromise.all([currentClassPromise, channelPromise]).only(
    CoreActions.samePageCheckGenerator(store),
    ([currentClassModel, channelsCollection]) => {
      const currentClass = _classState(currentClassModel);
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

function activateExam() {
  this.displayModal(false);
}

function deactivateExam() {
  this.displayModal(false);
}

function updateExamVisibility() {
  this.displayModal(false);
}
function previewExam() {
  this.displayModal(false);
}
function renameExam() {
  this.displayModal(false);
}
function deleteExam() {
  this.displayModal(false);
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
};
