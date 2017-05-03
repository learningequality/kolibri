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
const { assessmentMetaDataState } = require('kolibri.coreVue.vuex.mappers');
const { now } = require('kolibri.utils.serverClock');

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
  Object.assign(state, assessmentMetaDataState(data));
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
    id: data.id,
    title: data.title,
    channelId: data.channel_id,
    active: data.active,
    archive: data.archive,
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
  const userIsLoggedIn = coreGetters.isUserLoggedIn(store.state);
  store.dispatch('SET_PAGE_NAME', PageNames.EXAM_LIST);
  store.dispatch('CORE_SET_PAGE_LOADING', true);

  // if user is not logged in, this action is a noop
  if (!userIsLoggedIn) {
    store.dispatch('CORE_SET_PAGE_LOADING', false);
    return Promise.resolve();
  }

  return coreActions.setChannelInfo(store, channelId).then(
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


function calcQuestionsAnswered(attemptLogs) {
  let questionsAnswered = 0;
  Object.keys(attemptLogs).forEach((key) => {
    Object.keys(attemptLogs[key]).forEach(
    (innerKey) => {
      questionsAnswered += attemptLogs[key][innerKey].answer ? 1 : 0;
    });
  });
  return questionsAnswered;
}


function showExam(store, channelId, id, questionNumber) {
  if (store.state.pageName !== PageNames.EXAM) {
    store.dispatch('CORE_SET_PAGE_LOADING', true);
    store.dispatch('SET_PAGE_NAME', PageNames.EXAM);
  }

  if (!store.state.core.session.user_id) {
    store.dispatch('CORE_SET_ERROR', 'You must be logged in as a learner to view this page');
    store.dispatch('CORE_SET_PAGE_LOADING', false);
  } else {
    questionNumber = Number(questionNumber); // eslint-disable-line no-param-reassign

    const examPromise = UserExamResource.getModel(id, { channel_id: channelId }).fetch();
    const channelsPromise = coreActions.setChannelInfo(store, channelId);
    const examLogPromise = ExamLogResource.getCollection({
      user: store.state.core.session.user_id,
      exam: id,
    }).fetch();
    const examAttemptLogPromise = ExamAttemptLogResource.getCollection({
      user: store.state.core.session.user_id,
      exam: id,
    }).fetch();
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

        if (store.state.core.session.user_id && !coreGetters.isSuperuser(store.state)) {
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
              ExamLogResource.unCacheCollection({
                user: store.state.core.session.user_id,
                exam: id,
              });
            });
          }
          // Sort through all the exam attempt logs retrieved and organize them into objects
          // keyed first by content_id and then item id under that.
          if (examAttemptLogs.length > 0) {
            examAttemptLogs.forEach((log) => {
              if (!attemptLogs[log.content_id]) {
                attemptLogs[log.content_id] = {};
              }
              attemptLogs[log.content_id][log.item] = Object.assign({}, log);
            });
          }
        }

        const seed = exam.seed;
        const questionSources = exam.question_sources;

        // Create an array of objects with contentId and assessmentItemIndex
        // These will be used to select specific questions from the content node
        // The indices referred to shuffled positions in the content node's assessment_item_ids
        // property.
        // Wrap this all in a seededShuffle to give a consistent, repeatable shuffled order.
        const shuffledQuestions = seededShuffle.shuffle(
          createQuestionList(questionSources), seed, true);

        if (!shuffledQuestions[questionNumber]) {
          // Illegal question number!
          coreActions.handleError(store, `Question number ${questionNumber} is not valid for this exam`);
        } else {
          const contentPromise = ContentNodeResource.getCollection(
            { channel_id: channelId },
            { ids: questionSources.map(item => item.exercise_id) }).fetch();

          contentPromise.only(
            samePageCheckGenerator(store),
            (contentNodes) => {
              const contentNodeMap = {};

              contentNodes.forEach(node => { contentNodeMap[node.pk] = node; });

              const questions = shuffledQuestions.map(question => ({
                itemId: selectQuestionFromExercise(
                question.assessmentItemIndex,
                seed,
                contentNodeMap[question.contentId]),
                contentId: question.contentId
              }));

              if (questions.every(question => !question.itemId)) {
                // Exam is drawing solely on malformed exercise data, best to quit now
                coreActions.handleError(store, `This exam has no valid questions`);
              } else {
                const itemId = questions[questionNumber].itemId;

                const currentQuestion = questions[questionNumber];

                const questionsAnswered = Math.max(store.state.pageState.questionsAnswered || 0,
                  calcQuestionsAnswered(attemptLogs));

                const pageState = {
                  exam: _examState(exam),
                  itemId,
                  questions,
                  currentQuestion,
                  questionNumber,
                  content: _contentState(contentNodeMap[questions[questionNumber].contentId]),
                  channelId,
                  questionsAnswered,
                };
                if (!attemptLogs[currentQuestion.contentId]) {
                  attemptLogs[currentQuestion.contentId] = {};
                }
                if (!attemptLogs[currentQuestion.contentId][itemId]) {
                  attemptLogs[currentQuestion.contentId][itemId] = {
                    start_timestamp: now(),
                    completion_timestamp: null,
                    end_timestamp: null,
                    item: itemId,
                    complete: false,
                    time_spent: 0,
                    correct: 0,
                    answer: null,
                    simple_answer: '',
                    interaction_history: [],
                    hinted: false,
                    channel_id: channelId,
                    content_id: currentQuestion.contentId,
                  };
                }
                pageState.currentAttempt = attemptLogs[currentQuestion.contentId][itemId];
                store.dispatch('SET_EXAM_ATTEMPT_LOGS', attemptLogs);
                store.dispatch('SET_PAGE_STATE', pageState);
                store.dispatch('CORE_SET_PAGE_LOADING', false);
                store.dispatch('CORE_SET_ERROR', null);
                store.dispatch('CORE_SET_TITLE', `${pageState.exam.title} - ${currentChannel.title}`);
              }
            },
            error => { coreActions.handleApiError(store, error); }
          );
        }
      },
      error => { coreActions.handleApiError(store, error); }
    );
  }
}

function setAndSaveCurrentExamAttemptLog(store, contentId, itemId, currentAttemptLog) {
  // As soon as this has happened, we should clear any previous cache for the
  // UserExamResource - as that data has now changed.
  UserExamResource.clearCache();

  store.dispatch('SET_EXAM_ATTEMPT_LOGS', {
    [contentId]: ({
      [itemId]: currentAttemptLog,
    }),
  });
  const pageState = Object.assign(store.state.pageState);
  pageState.currentAttempt = currentAttemptLog;
  store.dispatch('SET_PAGE_STATE', pageState);
  // If a save has already been fired for this particular attempt log,
  // it may not have an id yet, so we can look for it by its uniquely
  // identifying fields, contentId and itemId.
  let examAttemptLogModel = ExamAttemptLogResource.findModel({
    content_id: contentId,
    item: itemId,
  });
  const attributes = Object.assign({}, currentAttemptLog);
  attributes.user = store.state.core.session.user_id;
  attributes.examlog = store.state.examLog.id;
  // If the above findModel returned no matching model, then we can do
  // getModel to get the new model instead.
  if (!examAttemptLogModel) {
    examAttemptLogModel = ExamAttemptLogResource.createModel(
      attributes);
  }
  const promise = examAttemptLogModel.save(attributes);
  return promise.then((newExamAttemptLog) =>
    new Promise((resolve, reject) => {
      const log = Object.assign({}, newExamAttemptLog);
      store.dispatch('SET_EXAM_ATTEMPT_LOGS', {
        [contentId]: ({
          [itemId]: log,
        }),
      });
      const questionsAnswered = calcQuestionsAnswered(store.state.examAttemptLogs);
      store.dispatch('SET_QUESTIONS_ANSWERED', questionsAnswered);
      const examAttemptLogCollection = ExamAttemptLogResource.getCollection({
        user: store.state.core.session.user_id,
        exam: store.state.pageState.exam.id,
      });
      // Add this attempt log to the Collection for future caching.
      examAttemptLogCollection.set(examAttemptLogModel);
      resolve();
    })
  );
}

function closeExam(store) {
  const examLog = Object.assign({}, store.state.examLog);
  examLog.closed = true;
  return ExamLogResource.getModel(examLog.id).save(examLog).catch(
    error => { coreActions.handleApiError(store, error); });
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
  setAndSaveCurrentExamAttemptLog,
  closeExam,
  prepareLearnApp: require('./prepareLearnApp'),
};
