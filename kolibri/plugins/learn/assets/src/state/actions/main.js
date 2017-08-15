import {
  ContentNodeResource,
  ContentNodeProgressResource,
  SessionResource,
  UserExamResource,
  ExamLogResource,
  ExamAttemptLogResource,
} from 'kolibri.resources';

import { PageNames } from '../../constants';

import * as coreActions from 'kolibri.coreVue.vuex.actions';
import ConditionalPromise from 'kolibri.lib.conditionalPromise';
import { samePageCheckGenerator } from 'kolibri.coreVue.vuex.actions';
import * as coreGetters from 'kolibri.coreVue.vuex.getters';
import * as CoreConstants from 'kolibri.coreVue.vuex.constants';
import router from 'kolibri.coreVue.router';
import seededShuffle from 'kolibri.lib.seededshuffle';
import { createQuestionList, selectQuestionFromExercise } from 'kolibri.utils.exams';
import { assessmentMetaDataState } from 'kolibri.coreVue.vuex.mappers';
import { now } from 'kolibri.utils.serverClock';
import prepareLearnApp from '../prepareLearnApp';

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

function validateProgress(data) {
  if (!data.progress_fraction) {
    return 0.0;
  } else if (data.progress_fraction > 1.0) {
    return 1.0;
  }
  return data.progress_fraction;
}

function _topicState(data, ancestors = []) {
  const progress = validateProgress(data);
  const thumbnail = data.files.find(file => file.thumbnail && file.available) || {};
  const state = {
    id: data.pk,
    title: data.title,
    description: data.description,
    thumbnail: thumbnail.storage_url,
    breadcrumbs: _crumbState(ancestors),
    parent: data.parent,
    kind: data.kind,
    progress,
  };
  return state;
}

function _contentState(data, nextContent, ancestors = []) {
  const progress = validateProgress(data);
  const thumbnail = data.files.find(file => file.thumbnail && file.available) || {};
  const state = {
    id: data.pk,
    title: data.title,
    kind: data.kind,
    description: data.description,
    thumbnail: thumbnail.storage_url,
    available: data.available,
    files: data.files,
    progress,
    breadcrumbs: _crumbState(ancestors),
    content_id: data.content_id,
    next_content: nextContent,
    author: data.author,
    license: data.license,
    license_description: data.license_description,
    license_owner: data.license_owner,
    parent: data.parent,
  };
  Object.assign(state, assessmentMetaDataState(data));
  return state;
}

function _collectionState(data) {
  return data.map(item => {
    if (item.kind === CoreConstants.ContentNodeKinds.TOPIC) {
      return _topicState(item);
    }
    return _contentState(item);
  });
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
 * Cache utility functions
 *
 * These methods are used to manipulate client side cache to reduce requests
 */

function updateContentNodeProgress(channelId, contentId, progressFraction) {
  /*
   * Update the progress_fraction directly on the model object, so as to prevent having
   * to cache bust the model (and hence the entire collection), because some progress was
   * made on this ContentNode.
   */
  const model = ContentNodeResource.getModel(contentId, {
    channel_id: channelId,
  });
  model.set({ progress_fraction: progressFraction });
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
          name: PageNames.EXPLORE_CHANNEL,
          params: { channel_id: currentChannel.id },
        });
      } else {
        router.getInstance().replace({ name: PageNames.CONTENT_UNAVAILABLE });
      }
    },
    error => {
      coreActions.handleApiError(store, error);
    }
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
          name: PageNames.LEARN_CHANNEL,
          params: { channel_id: currentChannel.id },
        });
      } else {
        router.getInstance().replace({ name: PageNames.CONTENT_UNAVAILABLE });
      }
    },
    error => {
      coreActions.handleApiError(store, error);
    }
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
  const childrenPromise = ContentNodeResource.getCollection(channelPayload, {
    parent: id,
  }).fetch();
  const channelsPromise = coreActions.setChannelInfo(store, channelId);
  const ancestorsPromise = ContentNodeResource.fetchAncestors(id, channelPayload);
  ConditionalPromise.all([topicPromise, childrenPromise, ancestorsPromise, channelsPromise]).only(
    samePageCheckGenerator(store),
    ([topic, children, ancestors]) => {
      const currentChannel = coreGetters.getCurrentChannelObject(store.state);
      if (!currentChannel) {
        router.replace({ name: PageNames.CONTENT_UNAVAILABLE });
        return;
      }
      const pageState = {};
      pageState.topic = _topicState(topic, ancestors);
      const collection = _collectionState(children);
      pageState.contents = collection;
      store.dispatch('SET_PAGE_STATE', pageState);
      // Topics are expensive to compute progress for, so we lazily load progress for them.
      const subtopicIds = collection
        .filter(item => item.kind === CoreConstants.ContentNodeKinds.TOPIC)
        .map(subtopic => subtopic.id);
      if (subtopicIds.length) {
        const topicProgressPromise = ContentNodeProgressResource.getCollection(channelPayload, {
          ids: subtopicIds,
        }).fetch();
        topicProgressPromise.then(progressArray => {
          store.dispatch('SET_TOPIC_PROGRESS', progressArray);
        });
      }
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);
      if (isRoot) {
        store.dispatch('CORE_SET_TITLE', `Topics - ${currentChannel.title}`);
      } else {
        store.dispatch('CORE_SET_TITLE', `${pageState.topic.title} - ${currentChannel.title}`);
      }
    },
    error => {
      coreActions.handleApiError(store, error);
    }
  );
}

function showExploreChannel(store, channelId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.EXPLORE_CHANNEL);

  coreActions.setChannelInfo(store, channelId).then(() => {
    const currentChannel = coreGetters.getCurrentChannelObject(store.state);
    if (!currentChannel) {
      router.replace({ name: PageNames.CONTENT_UNAVAILABLE });
      return;
    }
    showExploreTopic(store, channelId, currentChannel.root_id, true);
  });
}

function showExploreContent(store, channelId, id) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.EXPLORE_CONTENT);

  const contentPromise = ContentNodeResource.getModel(id, {
    channel_id: channelId,
  }).fetch();
  const nextContentPromise = ContentNodeResource.fetchNextContent(id, {
    channel_id: channelId,
  });
  const channelsPromise = coreActions.setChannelInfo(store, channelId);
  const ancestorsPromise = ContentNodeResource.fetchAncestors(id, {
    channel_id: channelId,
  });
  ConditionalPromise.all([
    contentPromise,
    channelsPromise,
    nextContentPromise,
    ancestorsPromise,
  ]).only(
    samePageCheckGenerator(store),
    ([content, channels, nextContent, ancestors]) => {
      const currentChannel = coreGetters.getCurrentChannelObject(store.state);
      if (!currentChannel) {
        router.replace({ name: PageNames.CONTENT_UNAVAILABLE });
        return;
      }
      const pageState = {
        content: _contentState(content, nextContent, ancestors),
      };
      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);
      store.dispatch('CORE_SET_TITLE', `${pageState.content.title} - ${currentChannel.title}`);
    },
    error => {
      coreActions.handleApiError(store, error);
    }
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
    { channel_id: channelId },
    { search: searchTerm }
  );
  const searchResultsPromise = contentCollection.fetch();

  searchResultsPromise
    .then(results => {
      const searchState = { searchTerm };
      searchState.contents = _collectionState(results);
      store.dispatch('SET_PAGE_STATE', searchState);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    })
    .catch(error => {
      coreActions.handleApiError(store, error);
    });
}

function clearSearch(store) {
  store.dispatch('SET_PAGE_STATE', {
    topics: [],
    contents: [],
    searchTerm: '',
  });
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
        name: PageNames.SEARCH,
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
  coreActions.setChannelInfo(store, channelId).then(() => {
    if (searchTerm) {
      triggerSearch(store, channelId, searchTerm);
    } else {
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    }
  });
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

  return coreActions.setChannelInfo(store, channelId).then(() => {
    const currentChannel = coreGetters.getCurrentChannelObject(store.state);
    if (!currentChannel) {
      router.replace({ name: PageNames.CONTENT_UNAVAILABLE });
      return;
    }
    UserExamResource.getCollection().fetch().only(
      samePageCheckGenerator(store),
      exams => {
        const pageState = {};
        pageState.exams = exams.map(_examState);
        store.dispatch('SET_PAGE_STATE', pageState);
        store.dispatch('CORE_SET_PAGE_LOADING', false);
        store.dispatch('CORE_SET_ERROR', null);
        store.dispatch('CORE_SET_TITLE', `Exams - ${currentChannel.title}`);
      },
      error => {
        coreActions.handleApiError(store, error);
      }
    );
  });
}

function calcQuestionsAnswered(attemptLogs) {
  let questionsAnswered = 0;
  Object.keys(attemptLogs).forEach(key => {
    Object.keys(attemptLogs[key]).forEach(innerKey => {
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

    const examPromise = UserExamResource.getModel(id).fetch();
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
          router.replace({ name: PageNames.CONTENT_UNAVAILABLE });
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
            examLogModel.save().then(newExamLog => {
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
            examAttemptLogs.forEach(log => {
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
          createQuestionList(questionSources),
          seed,
          true
        );

        if (!shuffledQuestions[questionNumber]) {
          // Illegal question number!
          coreActions.handleError(
            store,
            `Question number ${questionNumber} is not valid for this exam`
          );
        } else {
          const contentPromise = ContentNodeResource.getCollection(
            { channel_id: channelId },
            { ids: questionSources.map(item => item.exercise_id) }
          ).fetch();

          contentPromise.only(
            samePageCheckGenerator(store),
            contentNodes => {
              const contentNodeMap = {};

              contentNodes.forEach(node => {
                contentNodeMap[node.pk] = node;
              });

              const questions = shuffledQuestions.map(question => ({
                itemId: selectQuestionFromExercise(
                  question.assessmentItemIndex,
                  seed,
                  contentNodeMap[question.contentId]
                ),
                contentId: question.contentId,
              }));

              if (questions.every(question => !question.itemId)) {
                // Exam is drawing solely on malformed exercise data, best to quit now
                coreActions.handleError(store, `This exam has no valid questions`);
              } else {
                const itemId = questions[questionNumber].itemId;

                const currentQuestion = questions[questionNumber];

                const questionsAnswered = Math.max(
                  store.state.pageState.questionsAnswered || 0,
                  calcQuestionsAnswered(attemptLogs)
                );

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
                store.dispatch(
                  'CORE_SET_TITLE',
                  `${pageState.exam.title} - ${currentChannel.title}`
                );
              }
            },
            error => {
              coreActions.handleApiError(store, error);
            }
          );
        }
      },
      error => {
        coreActions.handleApiError(store, error);
      }
    );
  }
}

function setAndSaveCurrentExamAttemptLog(store, contentId, itemId, currentAttemptLog) {
  // As soon as this has happened, we should clear any previous cache for the
  // UserExamResource - as that data has now changed.
  UserExamResource.clearCache();

  store.dispatch('SET_EXAM_ATTEMPT_LOGS', {
    // prettier-ignore
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
    examAttemptLogModel = ExamAttemptLogResource.createModel(attributes);
  }
  const promise = examAttemptLogModel.save(attributes);
  return promise.then(
    newExamAttemptLog =>
      new Promise((resolve, reject) => {
        const log = Object.assign({}, newExamAttemptLog);
        store.dispatch('SET_EXAM_ATTEMPT_LOGS', {
          // prettier-ignore
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
  return ExamLogResource.getModel(examLog.id).save(examLog).catch(error => {
    coreActions.handleApiError(store, error);
  });
}

export {
  _contentState,
  redirectToExploreChannel,
  redirectToLearnChannel,
  showExploreChannel,
  showExploreTopic,
  showExploreContent,
  showContentUnavailable,
  triggerSearch,
  clearSearch,
  redirectToChannelSearch,
  showSearch,
  showExam,
  showExamList,
  setAndSaveCurrentExamAttemptLog,
  closeExam,
  prepareLearnApp,
  updateContentNodeProgress,
};
