const CoreApp = require('kolibri');
const pick = require('lodash/fp/pick');
const ConditionalPromise = require('kolibri.lib.conditionalPromise');
const CoreActions = require('kolibri.coreVue.vuex.actions');
const CoreConstants = require('kolibri.coreVue.vuex.constants');
const Constants = require('../../constants');

const ClassroomResource = CoreApp.resources.ClassroomResource;
const ChannelResource = CoreApp.resources.ChannelResource;
const LearnerGroupResource = CoreApp.resources.LearnerGroupResource;
const ContentNodeResource = CoreApp.resources.ContentNodeResource;
const ExamResource = CoreApp.resources.ExamResource;

const pickIdAndName = pick(['id', 'name']);

function _channelsState(channels) {
  return channels.map(({ id, name, root_pk }) => ({ id, name, rootPk: root_pk }));
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
    ExamResource.getCollectionForClass(classId).fetch(),
  ];

  return ConditionalPromise.all(resourceRequests).only(
    CoreActions.samePageCheckGenerator(store),
    ([classroom, learnerGroups, channels, exams]) => {
      const pageState = {
        channels: _channelsState(channels),
        classId,
        currentClass: pickIdAndName(classroom),
        currentClassGroups: learnerGroups.map(pickIdAndName),
        exams,
        modalShown: false,
      };

      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_ERROR', null);
      store.dispatch('CORE_SET_TITLE', 'Exams');
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    },
    error => {
      CoreActions.handleError(store, error);
    }
  );
}

function showCreateExamPage(store, classId, channelId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.CREATE_EXAM);
  const currentClassPromise = ClassroomResource.getModel(classId).fetch();

  ConditionalPromise.all([currentClassPromise]).only(
    CoreActions.samePageCheckGenerator(store),
    ([currentClassModel, channelsCollection]) => {
      const currentClass = pickIdAndName(currentClassModel);
      const pageState = {
        modalShown: false,
        currentClass,
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


function _crumbState(ancestors) {
  // skip the root node
  return ancestors.slice(1).map(ancestor => ({
    id: ancestor.pk,
    title: ancestor.title,
  }));
}


function _topicState(data) {
  const state = {
    id: data.pk,
    title: data.title,
    description: data.description,
    breadcrumbs: _crumbState(data.ancestors),
    next_content: data.next_content,
  };
  return state;
}

function _contentState(data) {
  let progress;
  if (!data.progress_fraction) {
    progress = 0.0;
  } else if (data.progress_fraction > 1.0) {
    progress = 1.0;
  } else {
    progress = data.progress_fraction;
  }
  const state = {
    id: data.pk,
    title: data.title,
    kind: data.kind,
    description: data.description,
    thumbnail: data.thumbnail,
    available: data.available,
    files: data.files,
    progress,
    content_id: data.content_id,
    breadcrumbs: _crumbState(data.ancestors),
    next_content: data.next_content,
    author: data.author,
    license: data.license,
    license_owner: data.license_owner,
  };
  return state;
}

function _collectionState(data) {
  const topics = data
    .filter((item) => item.kind === CoreConstants.ContentNodeKinds.TOPIC)
    .map((item) => _topicState(item));
  const contents = data
    .filter((item) => item.kind !== CoreConstants.ContentNodeKinds.TOPIC)
    .map((item) => _contentState(item));
  return { topics, contents };
}

function getChannelExercises(store, channelId, channelRootPk) {
  const channelPayload = { channel_id: channelId };
  const topicPromise = ContentNodeResource.getModel(channelRootPk, channelPayload).fetch();
  const childrenPromise =
    ContentNodeResource.getCollection(channelPayload, { parent: channelRootPk }).fetch();

  ConditionalPromise.all([topicPromise, childrenPromise]).only(
    CoreActions.samePageCheckGenerator(store),
    ([topic, children]) => {
      // store.dispatch('SET_TOPIC', topic);
      console.log(_topicState(topic));
      const collection = _collectionState(children);
      console.log(collection.topics);
      console.log(collection.contents);


      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);
    },
    error => { CoreActions.handleApiError(store, error); }
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
  getChannelExercises,
  showExamReportPage,
  showExamReportDetailPage,
  activateExam,
  deactivateExam,
  previewExam,
  renameExam,
  deleteExam,
  updateExamVisibility,
};
