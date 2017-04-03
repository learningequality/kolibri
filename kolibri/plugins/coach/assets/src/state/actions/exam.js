const CoreApp = require('kolibri');
const ConditionalPromise = require('kolibri.lib.conditionalPromise');
const CoreActions = require('kolibri.coreVue.vuex.actions');
const CoreConstants = require('kolibri.coreVue.vuex.constants');
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

function showCreateExamPage(store, classId, channelId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.CREATE_EXAM);
  const currentClassPromise = ClassroomResource.getModel(classId).fetch();

  ConditionalPromise.all([currentClassPromise]).only(
    CoreActions.samePageCheckGenerator(store),
    ([currentClassModel, channelsCollection]) => {
      const currentClass = _classState(currentClassModel);
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
