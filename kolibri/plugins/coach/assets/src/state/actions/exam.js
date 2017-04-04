const CoreApp = require('kolibri');
const ConditionalPromise = require('kolibri.lib.conditionalPromise');
const CoreActions = require('kolibri.coreVue.vuex.actions');
const CoreConstants = require('kolibri.coreVue.vuex.constants');
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

function breadcrumbsState(ancestors) {
  return ancestors.map(ancestor => ({
    id: ancestor.pk,
    title: ancestor.title,
  }));
}


function _topicState(data) {
  const breadcrumbs = data.ancestors;
  breadcrumbs.push({ pk: data.pk, title: data.title });
  return {
    id: data.pk,
    title: data.title,
    breadcrumbs: breadcrumbsState(breadcrumbs),
  };
}

function _contentState(data) {
  const breadcrumbs = data.ancestors;
  return {
    id: data.pk,
    title: data.title,
    kind: data.kind,
    description: data.description,
    thumbnail: data.thumbnail,
    available: data.available,
    files: data.files,
    content_id: data.content_id,
    breadcrumbs: breadcrumbsState(breadcrumbs),
    author: data.author,
    license: data.license,
    license_owner: data.license_owner,
  };
}

function _collectionState(data) {
  const topics = data.filter(
    item => item.kind === CoreConstants.ContentNodeKinds.TOPIC).map(item => _topicState(item));
  const contents = data.filter(
    item => item.kind !== CoreConstants.ContentNodeKinds.TOPIC).map(item => _contentState(item));
  return { topics, contents };
}

function showCreateExamPage(store, classId, channelId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.CREATE_EXAM);
  const currentClassPromise = ClassroomResource.getModel(classId).fetch();
  const channelPromise = ChannelResource.getCollection().fetch();

  ConditionalPromise.all([currentClassPromise, channelPromise]).only(
    CoreActions.samePageCheckGenerator(store),
    ([currentClassModel, channelsCollection]) => {
      const currentClass = _classState(currentClassModel);
      const currentChannel = _channelState(
        channelsCollection.find(channel => channel.id === channelId));
      const channelPayload = { channel_id: channelId };
      const channelRootPk = currentChannel.rootPk;

      const topicPromise = ContentNodeResource.getModel(channelRootPk, channelPayload).fetch();
      const childrenTopicsPromise = ContentNodeResource.getCollection(
        channelPayload, { parent: channelRootPk, kind: ContentNodeKinds.TOPIC }).fetch();
      const childrenExercisesPromise = ContentNodeResource.getCollection(
        channelPayload, { parent: channelRootPk, kind: ContentNodeKinds.EXERCISE }).fetch();

      ConditionalPromise.all([topicPromise, childrenTopicsPromise, childrenExercisesPromise]).only(
        CoreActions.samePageCheckGenerator(store),
        ([topicModel, childrenTopicsCollection, childrenExercisesCollection]) => {
          const topic = _topicState(topicModel);
          const collection = _collectionState(
            childrenTopicsCollection.concat(childrenExercisesCollection));
          const subtopics = collection.topics;
          const contents = collection.contents;

          const pageState = {
            currentClass,
            currentChannel,
            topic,
            subtopics,
            contents,
            fetching: false,
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
    },
    error => {
      CoreActions.handleError(store, error);
    }
  );
}

function fetchContent(store, channelId, topicId) {
  store.dispatch('SET_FETCHING', true);
  const channelPayload = { channel_id: channelId };
  const topicPromise = ContentNodeResource.getModel(topicId, channelPayload).fetch();
  const childrenTopicsPromise = ContentNodeResource.getCollection(
    channelPayload, { parent: topicId, kind: ContentNodeKinds.TOPIC }).fetch();
  const childrenExercisesPromise = ContentNodeResource.getCollection(
    channelPayload, { parent: topicId, kind: ContentNodeKinds.EXERCISE }).fetch();

  ConditionalPromise.all([topicPromise, childrenTopicsPromise, childrenExercisesPromise]).only(
    CoreActions.samePageCheckGenerator(store),
    ([topicModel, childrenTopicsCollection, childrenExercisesCollection]) => {
      const topics = _topicState(topicModel);
      const collection = _collectionState(
        childrenTopicsCollection.concat(childrenExercisesCollection));
      const subtopics = collection.topics;
      const contents = collection.contents;
      store.dispatch('SET_TOPICS', topics);
      store.dispatch('SET_SUBTOPICS', subtopics);
      store.dispatch('SET_CONTENTS', contents);
      store.dispatch('SET_FETCHING', false);
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
