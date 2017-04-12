const ContentNodeResource = require('kolibri').resources.ContentNodeResource;
const SessionResource = require('kolibri').resources.SessionResource;
const constants = require('../constants');
const UserExamResource = require('kolibri').resources.UserExamResource;
const ExamLogResource = require('kolibri').resources.ExamLogResource;
const ExamAttemptLogResource = require('kolibri').resources.ExamAttemptLogResource;

const PageNames = constants.PageNames;
const coreActions = require('kolibri.coreVue.vuex.actions');
const ConditionalPromise = require('kolibri.lib.conditionalPromise');
const samePageCheckGenerator = require('kolibri.coreVue.vuex.actions').samePageCheckGenerator;
const coreGetters = require('kolibri.coreVue.vuex.getters');
const CoreConstants = require('kolibri.coreVue.vuex.constants');
const router = require('kolibri.coreVue.router');
const seededShuffle = require('kolibri.lib.seededshuffle');
const { createQuestionList, selectQuestionFromExercise } = require('kolibri.utils.exams');

/**
 * Vuex State Mappers
 *
 * The methods below help map data from
 * the API to state in the Vuex store
 */

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

function _validateAssessmentMetaData(data) {
  // Data is coming from a serializer for a one to many key, so at least will return an empty array.
  const assessmentMetaData = data.assessmentmetadata[0];
  if (!assessmentMetaData) {
    return {
      assessment: false,
    };
  }
  const assessmentIds = JSON.parse(assessmentMetaData.assessment_item_ids || '[]');
  const masteryModel = JSON.parse(assessmentMetaData.mastery_model || '{}');
  if (!assessmentIds.length || !Object.keys(masteryModel).length) {
    return {
      assessment: false,
    };
  }
  return {
    assessment: true,
    assessmentIds,
    masteryModel,
    randomize: assessmentMetaData.randomize,
  };
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
  Object.assign(state, _validateAssessmentMetaData(data));
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

function _examState(data) {
  const state = {
    id: data.pk,
    title: data.title,
    channelId: data.channel_id,
    active: data.active,
    archived: data.archived,
    closed: data.closed,
    answerCount: data.answer_count,
    questionCount: data.question_count,
    score: data.score,
  };
  return state;
}

function _examLoggingState(data) {
  const state = {
    id: data.id,
    closed: data.closed,
  };
  return state;
}


/**
 * Actions
 *
 * These methods are used to update client-side state
 */

function redirectToExploreChannel(store) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.EXPLORE_ROOT);

  coreActions.setChannelInfo(store).then(
    () => {
      const currentChannel = coreGetters.getCurrentChannelObject(store.state);
      if (currentChannel) {
        router.getInstance().replace({
          name: constants.PageNames.EXPLORE_CHANNEL,
          params: { channel_id: currentChannel.id },
        });
      } else {
        router.getInstance().replace({ name: constants.PageNames.CONTENT_UNAVAILABLE });
      }
    },
    error => { coreActions.handleApiError(store, error); }
  );
}


function redirectToLearnChannel(store) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.LEARN_ROOT);

  coreActions.setChannelInfo(store).then(
    () => {
      const currentChannel = coreGetters.getCurrentChannelObject(store.state);
      if (currentChannel) {
        router.getInstance().replace({
          name: constants.PageNames.LEARN_CHANNEL,
          params: { channel_id: currentChannel.id },
        });
      } else {
        router.getInstance().replace({ name: constants.PageNames.CONTENT_UNAVAILABLE });
      }
    },
    error => { coreActions.handleApiError(store, error); }
  );
}


function showExploreTopic(store, channelId, id, isRoot = false) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  if (isRoot) {
    store.dispatch('SET_PAGE_NAME', PageNames.EXPLORE_CHANNEL);
  } else {
    store.dispatch('SET_PAGE_NAME', PageNames.EXPLORE_TOPIC);
  }

  const channelPayload = { channel_id: channelId };
  const topicPromise = ContentNodeResource.getModel(id, channelPayload).fetch();
  const childrenPromise = ContentNodeResource.getCollection(
    channelPayload, { parent: id }).fetch();
  const channelsPromise = coreActions.setChannelInfo(store, channelId);
  ConditionalPromise.all([topicPromise, childrenPromise, channelsPromise]).only(
    samePageCheckGenerator(store),
    ([topic, children]) => {
      const currentChannel = coreGetters.getCurrentChannelObject(store.state);
      if (!currentChannel) {
        router.replace({ name: constants.PageNames.CONTENT_UNAVAILABLE });
        return;
      }
      const pageState = {};
      pageState.topic = _topicState(topic);
      const collection = _collectionState(children);
      pageState.subtopics = collection.topics;
      pageState.contents = collection.contents;
      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);
      if (isRoot) {
        store.dispatch('CORE_SET_TITLE', `Topics - ${currentChannel.title}`);
      } else {
        store.dispatch('CORE_SET_TITLE', `${pageState.topic.title} - ${currentChannel.title}`);
      }
    },
    error => { coreActions.handleApiError(store, error); }
  );
}


function showExploreChannel(store, channelId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.EXPLORE_CHANNEL);

  coreActions.setChannelInfo(store, channelId).then(
    () => {
      const currentChannel = coreGetters.getCurrentChannelObject(store.state);
      if (!currentChannel) {
        router.replace({ name: constants.PageNames.CONTENT_UNAVAILABLE });
        return;
      }
      showExploreTopic(store, channelId, currentChannel.root_id, true);
    }
  );
}


function showExploreContent(store, channelId, id) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.EXPLORE_CONTENT);

  const contentPromise = ContentNodeResource.getModel(id, { channel_id: channelId }).fetch();
  const channelsPromise = coreActions.setChannelInfo(store, channelId);
  ConditionalPromise.all([contentPromise, channelsPromise]).only(
    samePageCheckGenerator(store),
    ([content]) => {
      const currentChannel = coreGetters.getCurrentChannelObject(store.state);
      if (!currentChannel) {
        router.replace({ name: constants.PageNames.CONTENT_UNAVAILABLE });
        return;
      }
      const pageState = { content: _contentState(content) };
      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);
      store.dispatch('CORE_SET_TITLE', `${pageState.content.title} - ${currentChannel.title}`);
    },
    error => { coreActions.handleApiError(store, error); }
  );
}


function showLearnChannel(store, channelId, page = 1) {
  // Special case for when only the page number changes:
  // Don't set the 'page loading' boolean, to prevent flash and loss of keyboard focus.
  const state = store.state;
  if (state.pageName !== PageNames.LEARN_CHANNEL || state.currentChannel !== channelId) {
    store.dispatch('CORE_SET_PAGE_LOADING', true);
  }
  store.dispatch('SET_PAGE_NAME', PageNames.LEARN_CHANNEL);

  const ALL_PAGE_SIZE = 6;

  const sessionPromise = SessionResource.getModel('current').fetch();
  const channelsPromise = coreActions.setChannelInfo(store, channelId);
  ConditionalPromise.all([sessionPromise, channelsPromise]).only(
    samePageCheckGenerator(store),
    ([session]) => {
      if (!coreGetters.getCurrentChannelObject(store.state)) {
        router.replace({ name: constants.PageNames.CONTENT_UNAVAILABLE });
        return;
      }
      const nextStepsPayload = { next_steps: session.user_id };
      const popularPayload = { popular: session.user_id };
      const resumePayload = { resume: session.user_id };
      const allPayload = { kind: 'content' };
      const channelPayload = { channel_id: channelId };
      const nextStepsPromise = ContentNodeResource.getCollection(
        channelPayload, nextStepsPayload).fetch();
      const popularPromise = ContentNodeResource.getCollection(
        channelPayload, popularPayload).fetch();
      const resumePromise = ContentNodeResource.getCollection(
        channelPayload, resumePayload).fetch();
      const allContentResource = ContentNodeResource.getPagedCollection(
        channelPayload,
        allPayload,
        ALL_PAGE_SIZE,
        page
      );
      const allPromise = allContentResource.fetch();
      ConditionalPromise.all(
        [nextStepsPromise, popularPromise, resumePromise, allPromise]
      ).only(
        samePageCheckGenerator(store),
        ([nextSteps, popular, resume, allContent]) => {
          const pageState = {
            recommendations: {
              nextSteps: nextSteps.map(_contentState),
              popular: popular.map(_contentState),
              resume: resume.map(_contentState),
            },
            all: {
              content: allContent.map(_contentState),
              pageCount: allContentResource.pageCount,
              page,
            },
          };
          store.dispatch('SET_PAGE_STATE', pageState);
          store.dispatch('CORE_SET_PAGE_LOADING', false);
          store.dispatch('CORE_SET_ERROR', null);

          const currentChannel = coreGetters.getCurrentChannelObject(store.state);
          store.dispatch('CORE_SET_TITLE', `Learn - ${currentChannel.title}`);

          // preload next page
          if (allContentResource.hasNext) {
            ContentNodeResource.getPagedCollection(
              channelPayload, allPayload, ALL_PAGE_SIZE, page + 1).fetch();
          }
        },
        error => { coreActions.handleApiError(store, error); }
      );
    },
    error => { coreActions.handleApiError(store, error); }
  );
}


function showLearnContent(store, channelId, id) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.LEARN_CONTENT);
  const channelPayload = { channel_id: channelId };
  const contentPromise = ContentNodeResource.getModel(id, channelPayload).fetch();
  const recommendedPromise = ContentNodeResource.getCollection(
    channelPayload, { recommendations_for: id }).fetch();
  const channelsPromise = coreActions.setChannelInfo(store, channelId);
  ConditionalPromise.all([contentPromise, channelsPromise]).only(
    samePageCheckGenerator(store),
    ([content]) => {
      const currentChannel = coreGetters.getCurrentChannelObject(store.state);
      if (!currentChannel) {
        router.replace({ name: constants.PageNames.CONTENT_UNAVAILABLE });
        return;
      }
      const pageState = {
        content: _contentState(content),
        recommended: store.state.pageState.recommended,
      };
      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);
      store.dispatch('CORE_SET_TITLE', `${pageState.content.title} - ${currentChannel.title}`);
    },
    error => { coreActions.handleApiError(store, error); }
  );
  recommendedPromise.only(
    samePageCheckGenerator(store),
    (recommended) => {
      const pageState = {
        content: store.state.pageState.content,
        recommended: recommended.map(_contentState),
      };
      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_ERROR', null);
    },
    error => { coreActions.handleApiError(store, error); }
  );
}


function triggerSearch(store, channelId, searchTerm) {
  if (!searchTerm) {
    const searchState = {
      searchTerm,
      topics: [],
      contents: [],
    };
    store.dispatch('SET_PAGE_STATE', searchState);
    return;
  }

  const contentCollection = ContentNodeResource.getPagedCollection(
    { channel_id: channelId }, { search: searchTerm });
  const searchResultsPromise = contentCollection.fetch();

  searchResultsPromise.then((results) => {
    const searchState = { searchTerm };
    const collection = _collectionState(results);
    searchState.topics = collection.topics;
    searchState.contents = collection.contents;
    store.dispatch('SET_PAGE_STATE', searchState);
    store.dispatch('CORE_SET_PAGE_LOADING', false);
  })
  .catch(error => { coreActions.handleApiError(store, error); });
}

function clearSearch(store) {
  store.dispatch('SET_PAGE_STATE', {
    topics: [],
    contents: [],
    searchTerm: '',
  });
}


function showScratchpad(store) {
  store.dispatch('SET_PAGE_NAME', PageNames.SCRATCHPAD);
  store.dispatch('SET_PAGE_STATE', {});
  store.dispatch('CORE_SET_PAGE_LOADING', false);
  store.dispatch('CORE_SET_ERROR', null);
  store.dispatch('CORE_SET_TITLE', 'Scratchpad');
}


function showContentUnavailable(store) {
  store.dispatch('SET_PAGE_NAME', PageNames.CONTENT_UNAVAILABLE);
  store.dispatch('SET_PAGE_STATE', {});
  store.dispatch('CORE_SET_PAGE_LOADING', false);
  store.dispatch('CORE_SET_ERROR', null);
  store.dispatch('CORE_SET_TITLE', 'Content Unavailable');
}

function redirectToChannelSearch(store) {
  store.dispatch('SET_PAGE_NAME', PageNames.SEARCH_ROOT);
  store.dispatch('SET_PAGE_STATE', {});
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('CORE_SET_ERROR', null);
  store.dispatch('CORE_SET_TITLE', 'Search');
  clearSearch(store);
  coreActions.setChannelInfo(store).then(
    () => {
      const currentChannel = coreGetters.getCurrentChannelObject(store.state);
      router.getInstance().replace({
        name: constants.PageNames.SEARCH,
        params: { channel_id: currentChannel.id },
      });
    },
    error => {
      coreActions.handleApiError(store, error);
    }
  );
}

function showSearch(store, channelId, searchTerm) {
  store.dispatch('SET_PAGE_NAME', PageNames.SEARCH);
  store.dispatch('SET_PAGE_STATE', {});
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('CORE_SET_ERROR', null);
  store.dispatch('CORE_SET_TITLE', 'Search');
  clearSearch(store);
  coreActions.setChannelInfo(store, channelId).then(
    () => {
      if (searchTerm) {
        triggerSearch(store, channelId, searchTerm);
      } else {
        store.dispatch('CORE_SET_PAGE_LOADING', false);
      }
    }
  );
}

function showExamList(store, channelId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.EXAM_LIST);

  coreActions.setChannelInfo(store, channelId).then(
    () => {
      const currentChannel = coreGetters.getCurrentChannelObject(store.state);
      if (!currentChannel) {
        router.replace({ name: constants.PageNames.CONTENT_UNAVAILABLE });
        return;
      }
      UserExamResource.getCollection({ channel_id: channelId }).fetch().only(
        samePageCheckGenerator(store),
        (exams) => {
          const pageState = {};
          pageState.exams = exams.map(_examState);
          store.dispatch('SET_PAGE_STATE', pageState);
          store.dispatch('CORE_SET_PAGE_LOADING', false);
          store.dispatch('CORE_SET_ERROR', null);
          store.dispatch('CORE_SET_TITLE', `Exams - ${currentChannel.title}`);
        },
        error => { coreActions.handleApiError(store, error); }
      );
    }
  );
}


function showExam(store, channelId, id, questionNumber) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.EXAM);

  const examPromise = UserExamResource.getModel(id, { channel_id: channelId }).fetch();
  const channelsPromise = coreActions.setChannelInfo(store, channelId);
  const examLogPromise = ExamLogResource.getCollection({
    user: store.state.core.session.user_id,
    exam: id,
  }).fetch();
  const examAttemptLogPromise = ExamAttemptLogResource.getCollection({
    user: store.state.core.session.user_id,
    exam: id,
  });
  ConditionalPromise.all([
    examPromise,
    channelsPromise,
    examLogPromise,
    examAttemptLogPromise,
  ]).only(
    samePageCheckGenerator(store),
    ([exam, channel, examLogs, examAttemptLogs]) => {
      const currentChannel = coreGetters.getCurrentChannelObject(store.state);
      if (!currentChannel) {
        router.replace({ name: constants.PageNames.CONTENT_UNAVAILABLE });
        return;
      }

      const attemptLogs = {};

      if (store.state.core.session.user_id &&
        store.state.core.session.kind[0] !== CoreConstants.UserKinds.SUPERUSER) {
        if (examLogs.length > 0 && examLogs.some(log => !log.closed)) {
          store.dispatch('SET_EXAM_LOG', _examLoggingState(examLogs.find(log => !log.closed)));
        } else {
          const examLogModel = ExamLogResource.createModel({
            user: store.state.core.session.user_id,
            exam: id,
            closed: false,
          });
          examLogModel.save().then((newExamLog) => {
            store.dispatch('SET_EXAM_LOG', newExamLog);
          });
        }
        // Sort through all the exam attempt logs retrieved and organize them into objects
        // keyed first by content_id and then item id under that.
        if (examAttemptLogs.length > 0) {
          examAttemptLogs.forEach((log) => {
            if (!attemptLogs[log.content_id]) {
              attemptLogs[log.content_id] = {};
            }
            attemptLogs[log.content_id][log.item] = log;
          });
        }
      }

      const seed = exam.seed;
      const questionSources = JSON.parse(exam.question_sources);

      // Create an array of objects with contentId and assessmentItemIndex
      // These will be used to select specific questions from the content node
      // The indices referred to shuffled positions in the content node's assessment_item_ids
      // property.
      // Wrap this all in a seededShuffle to give a consistent, repeatable shuffled order.
      const questions = seededShuffle.shuffle(createQuestionList(questionSources), seed, true);

      const currentQuestion = questions[questionNumber];

      if (!currentQuestion) {
        // Illegal question number!
        coreActions.handleError(store, `Question number ${questionNumber} is not valid for this exam`);
      } else {
        const contentPromise = ContentNodeResource.getModel(
          currentQuestion.contentId, { channel_id: channelId }).fetch();

        contentPromise.then(
          (contentNode) => {
            const itemId = selectQuestionFromExercise(
              currentQuestion.index,
              seed,
              contentNode);

            const pageState = {
              exam: _examState(exam),
              attemptLogs,
              itemId,
              questions,
              currentQuestion,
              questionNumber,
            };
            if (!pageState.attemptLogs[currentQuestion.contentId]) {
              pageState.attemptLogs[currentQuestion.contentId] = {};
            }
            if (!pageState.attemptLogs[currentQuestion.contentId][itemId]) {
              pageState.attemptLogs[currentQuestion.contentId][itemId] = {
                start_timestamp: new Date(),
                completion_timestamp: null,
                end_timestamp: null,
                item: itemId,
                complete: false,
                time_spent: 0,
                correct: 0,
                answer: undefined,
                simple_answer: '',
                interaction_history: [],
                hinted: false,
                channel_id: channelId,
                content_id: currentQuestion.contentId,
              };
            }
            store.dispatch('SET_PAGE_STATE', pageState);
            store.dispatch('CORE_SET_PAGE_LOADING', false);
            store.dispatch('CORE_SET_ERROR', null);
            store.dispatch('CORE_SET_TITLE', `${pageState.exam.title} - ${currentChannel.title}`);
          },
          error => { coreActions.handleApiError(store, error); }
        );
      }
    },
    error => { coreActions.handleApiError(store, error); }
  );
}

module.exports = {
  redirectToExploreChannel,
  redirectToLearnChannel,
  showExploreChannel,
  showExploreTopic,
  showExploreContent,
  showLearnChannel,
  showLearnContent,
  showScratchpad,
  showContentUnavailable,
  triggerSearch,
  clearSearch,
  redirectToChannelSearch,
  showSearch,
  showExam,
  showExamList,
};
