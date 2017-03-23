const CoreApp = require('kolibri');
const ConditionalPromise = require('kolibri.lib.conditionalPromise');
const CoreActions = require('kolibri.coreVue.vuex.actions');
const GetDefaultChannelId = require('kolibri.coreVue.vuex.getters').getDefaultChannelId;
const Constants = require('../../constants');

const ClassroomResource = CoreApp.resources.ClassroomResource;
const ChannelResource = CoreApp.resources.ChannelResource;
const LearnerGroupResource = CoreApp.resources.LearnerGroupResource;


function _classState(classroom) {
  return {
    id: classroom.id,
    name: classroom.name,
  };
}

function _classesState(classes) {
  return classes.map(classroom => _classState(classroom));
}

function _channelState(channel) {
  return {
    id: channel.id,
    name: channel.name,
    root_pk: channel.root_pk,
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

function _getCurrentChannelObject(currentChannelId, channels) {
  return channels.find(channel => channel.id === currentChannelId);
}

function displayModal(store, modalName) {
  store.dispatch('SET_MODAL', modalName);
}


function showExamsPage(store, classId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.EXAMS);

  const classPromise = ClassroomResource.getCollection().fetch();
  const currentClassPromise = ClassroomResource.getModel(classId).fetch();
  const channelPromise = ChannelResource.getCollection().fetch();
  const groupPromise = LearnerGroupResource.getCollection({ parent: classId }).fetch();

  ConditionalPromise.all([classPromise, currentClassPromise, channelPromise, groupPromise]).only(
    CoreActions.samePageCheckGenerator(store),
    ([classesCollection, currentClassModel, channelsCollection, groupsCollection]) => {
      const channels = _channelsState(channelsCollection);
      const currentChannel =
        _getCurrentChannelObject(GetDefaultChannelId(channelsCollection), channels);
      const classes = _classesState(classesCollection);
      const currentClass = _classState(currentClassModel);
      const currentClassGroups = _groupsState(groupsCollection);

      const pageState = {
        modalShown: false,
        channels,
        currentChannel,
        classes,
        currentClass,
        currentClassGroups,
        exams: [{
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
        }],
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

function showCreateExamPage(store, classId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.CREATE_EXAM);
  store.dispatch('SET_PAGE_STATE', {});
  store.dispatch('CORE_SET_ERROR', null);
  store.dispatch('CORE_SET_TITLE', ('New Exam'));
  store.dispatch('CORE_SET_PAGE_LOADING', false);
}

function activateExam() {
  this.displayModal(false);
}

function updateExamVisibility() {
  this.displayModal(false);
}

module.exports = {
  displayModal,
  showExamsPage,
  showCreateExamPage,
  activateExam,
  updateExamVisibility,
};
