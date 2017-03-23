const CoreApp = require('kolibri');
const ConditionalPromise = require('kolibri.lib.conditionalPromise');
const CoreActions = require('kolibri.coreVue.vuex.actions');
const GetDefaultChannelId = require('kolibri.coreVue.vuex.getters').getDefaultChannelId;
const Constants = require('./state/constants');

const ClassroomResource = CoreApp.resources.ClassroomResource;
const ChannelResource = CoreApp.resources.ChannelResource;


function showExamsPage(store, classId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.COACH_EXAMS_PAGE);
  const classPromise = ClassroomResource.getCollection().fetch();
  const currentClassPromise = ClassroomResource.getModel(classId).fetch();
  const channelPromise = ChannelResource.getCollection().fetch();

  ConditionalPromise.all([classPromise, currentClassPromise, channelPromise]).only(
    CoreActions.samePageCheckGenerator(store),
    ([classesCollection, currentClassModel, channelsCollection]) => {
      const pageState = {
        classes: classesCollection,
        currentClass: currentClassModel,
        exams: [{
          title: 'Exam 1',
          active: false,
          dateCreated: 'March 15, 2017 03:24:00',
          visibleTo: ['groupA', 'groupB'],
        },
        {
          title: 'Exam 2',
          active: true,
          dateCreated: 'March 21, 2017 03:24:00',
          visibleTo: ['groupB'],
        }],
        currentChannel: GetDefaultChannelId(channelsCollection),
        channels: channelsCollection,
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

module.exports = {
  showExamsPage,
};
