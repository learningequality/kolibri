import {
  ContentNodeResource,
  ContentNodeProgressResource,
  UserExamResource,
  ExamLogResource,
  ExamAttemptLogResource,
} from 'kolibri.resources';

import { getChannelObject, isUserLoggedIn, getChannels } from 'kolibri.coreVue.vuex.getters';
import {
  setChannelInfo,
  handleError,
  handleApiError,
  samePageCheckGenerator,
} from 'kolibri.coreVue.vuex.actions';
import { createQuestionList, selectQuestionFromExercise } from 'kolibri.utils.exams';
import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
import { PageNames } from '../../constants';
import { assessmentMetaDataState } from 'kolibri.coreVue.vuex.mappers';
import { now } from 'kolibri.utils.serverClock';

import ConditionalPromise from 'kolibri.lib.conditionalPromise';
import router from 'kolibri.coreVue.router';
import seededShuffle from 'kolibri.lib.seededshuffle';
import prepareLearnApp from '../prepareLearnApp';
import { createTranslator } from 'kolibri.utils.i18n';

const name = 'topicTreeExplorationPageTitles';

const messages = {
  topicsForChannelPageTitle: 'Topics - { currentChannelTitle }',
  currentTopicForChannelPageTitle: '{ currentTopicTitle } - { currentChannelTitle }',
  currentContentForChannelPageTitle: '{ currentContentTitle } - { currentChannelTitle }',
  contentUnavailablePageTitle: 'Content Unavailable',
  searchPageTitle: 'Search',
  examsListPageTitle: 'Exams',
  currentExamPageTitle: '{ currentExamTitle} - { currentChannelTitle }',
};

const translator = createTranslator(name, messages);

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
    kind: data.parent ? data.kind : ContentNodeKinds.CHANNEL,
    progress,
    channel_id: data.channel_id,
  };
  return state;
}

function contentState(data, nextContent, ancestors = []) {
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
    license: data.license_name,
    license_description: data.license_description,
    license_owner: data.license_owner,
    parent: data.parent,
    lang: data.lang,
    channel_id: data.channel_id,
  };
  Object.assign(state, assessmentMetaDataState(data));
  return state;
}

function _collectionState(data) {
  return data.map(item => {
    if (item.kind === ContentNodeKinds.TOPIC) {
      return _topicState(item);
    }
    return contentState(item);
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
  const model = ContentNodeResource.getModel(contentId);
  model.set({ progress_fraction: progressFraction });
}

function setAndCheckChannels(store) {
  return setChannelInfo(store).then(
    () => {
      const channels = getChannels(store.state);
      if (!channels.length) {
        router.replace({ name: PageNames.CONTENT_UNAVAILABLE });
      }
      return channels;
    },
    error => {
      handleApiError(store, error);
    }
  );
}

/**
 * Actions
 *
 * These methods are used to update client-side state
 */

function showChannels(store) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.TOPICS_ROOT);

  setAndCheckChannels(store).then(
    channels => {
      if (!channels.length) {
        return;
      }
      const channelRootIds = channels.map(channel => channel.root);
      ContentNodeResource.getCollection({ ids: channelRootIds })
        .fetch()
        .then(channelCollection => {
          const rootNodes = _collectionState(channelCollection);
          rootNodes.forEach(rootNode => {
            rootNode.thumbnail = channels.find(
              channel => channel.id === rootNode.channel_id
            ).thumbnail;
          });
          const pageState = { rootNodes };
          store.dispatch('SET_PAGE_STATE', pageState);
          store.dispatch('CORE_SET_PAGE_LOADING', false);
          store.dispatch('CORE_SET_ERROR', null);
        });
    },
    error => {
      handleApiError(store, error);
    }
  );
}

function showTopicsTopic(store, id, isRoot = false) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  if (isRoot) {
    store.dispatch('SET_PAGE_NAME', PageNames.TOPICS_CHANNEL);
  } else {
    store.dispatch('SET_PAGE_NAME', PageNames.TOPICS_TOPIC);
  }

  const topicPromise = ContentNodeResource.getModel(id).fetch();
  const childrenPromise = ContentNodeResource.getCollection({
    parent: id,
  }).fetch();
  const channelsPromise = setChannelInfo(store);
  const ancestorsPromise = ContentNodeResource.fetchAncestors(id);
  ConditionalPromise.all([topicPromise, childrenPromise, ancestorsPromise, channelsPromise]).only(
    samePageCheckGenerator(store),
    ([topic, children, ancestors]) => {
      const currentChannel = getChannelObject(store.state, topic.channel_id);
      if (!currentChannel) {
        router.replace({ name: PageNames.CONTENT_UNAVAILABLE });
        return;
      }
      const pageState = {
        isRoot: isRoot,
      };
      pageState.channel = currentChannel;
      pageState.topic = _topicState(topic, ancestors);
      const collection = _collectionState(children);
      pageState.contents = collection;
      store.dispatch('SET_PAGE_STATE', pageState);
      // Topics are expensive to compute progress for, so we lazily load progress for them.
      const subtopicIds = collection
        .filter(item => item.kind === ContentNodeKinds.TOPIC)
        .map(subtopic => subtopic.id);
      if (subtopicIds.length) {
        const topicProgressPromise = ContentNodeProgressResource.getCollection({
          ids: subtopicIds,
        }).fetch();
        topicProgressPromise.then(progressArray => {
          store.dispatch('SET_TOPIC_PROGRESS', progressArray);
        });
      }
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);
      if (isRoot) {
        store.dispatch(
          'CORE_SET_TITLE',
          translator.$tr('topicsForChannelPageTitle', { currentChannelTitle: currentChannel.title })
        );
      } else {
        store.dispatch(
          'CORE_SET_TITLE',
          translator.$tr('currentTopicForChannelPageTitle', {
            currentTopicTitle: pageState.topic.title,
            currentChannelTitle: currentChannel.title,
          })
        );
      }
    },
    error => {
      handleApiError(store, error);
    }
  );
}

function showTopicsChannel(store, id) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.TOPICS_CHANNEL);
  showTopicsTopic(store, id, true);
}

function showTopicsContent(store, id) {
  store.dispatch('SET_EMPTY_LOGGING_STATE');
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.TOPICS_CONTENT);

  const contentPromise = ContentNodeResource.getModel(id).fetch();
  const nextContentPromise = ContentNodeResource.fetchNextContent(id);
  const channelsPromise = setChannelInfo(store);
  const ancestorsPromise = ContentNodeResource.fetchAncestors(id);
  ConditionalPromise.all([
    contentPromise,
    nextContentPromise,
    ancestorsPromise,
    channelsPromise,
  ]).only(
    samePageCheckGenerator(store),
    ([content, nextContent, ancestors]) => {
      const currentChannel = getChannelObject(store.state, content.channel_id);
      if (!currentChannel) {
        router.replace({ name: PageNames.CONTENT_UNAVAILABLE });
        return;
      }
      const pageState = {
        content: contentState(content, nextContent, ancestors),
        channel: currentChannel,
      };
      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);
      store.dispatch(
        'CORE_SET_TITLE',
        translator.$tr('currentContentForChannelPageTitle', {
          currentContentTitle: pageState.content.title,
          currentChannelTitle: currentChannel.title,
        })
      );
    },
    error => {
      handleApiError(store, error);
    }
  );
}

function triggerSearch(store, searchTerm) {
  if (!searchTerm) {
    const searchState = {
      searchTerm,
      topics: [],
      contents: [],
    };
    store.dispatch('SET_PAGE_STATE', searchState);
    return;
  }

  const contentCollection = ContentNodeResource.getPagedCollection({ search: searchTerm });
  const searchResultsPromise = contentCollection.fetch();

  searchResultsPromise
    .then(results => {
      const searchState = { searchTerm };
      searchState.contents = _collectionState(results);
      store.dispatch('SET_PAGE_STATE', searchState);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    })
    .catch(error => {
      handleApiError(store, error);
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
  store.dispatch('CORE_SET_TITLE', translator.$tr('contentUnavailablePageTitle'));
}

function showSearch(store, searchTerm) {
  store.dispatch('SET_PAGE_NAME', PageNames.SEARCH);
  store.dispatch('SET_PAGE_STATE', {});
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('CORE_SET_ERROR', null);
  store.dispatch('CORE_SET_TITLE', translator.$tr('searchPageTitle'));
  clearSearch(store);
  setAndCheckChannels(store).then(channels => {
    if (!channels.length) {
      return;
    }
    if (searchTerm) {
      triggerSearch(store, searchTerm);
    } else {
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    }
  });
}

function showExamList(store) {
  const userIsLoggedIn = isUserLoggedIn(store.state);
  store.dispatch('SET_PAGE_NAME', PageNames.EXAM_LIST);
  store.dispatch('CORE_SET_PAGE_LOADING', true);

  // if user is not logged in, this action is a noop
  if (!userIsLoggedIn) {
    store.dispatch('CORE_SET_PAGE_LOADING', false);
    return Promise.resolve();
  }

  return UserExamResource.getCollection()
    .fetch()
    .only(
      samePageCheckGenerator(store),
      exams => {
        const pageState = {};
        pageState.exams = exams.map(_examState);
        store.dispatch('SET_PAGE_STATE', pageState);
        store.dispatch('CORE_SET_PAGE_LOADING', false);
        store.dispatch('CORE_SET_ERROR', null);
        store.dispatch('CORE_SET_TITLE', translator.$tr('examsListPageTitle'));
      },
      error => {
        handleApiError(store, error);
      }
    );
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

function showExam(store, id, questionNumber) {
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
      examLogPromise,
      examAttemptLogPromise,
      setAndCheckChannels(store),
    ]).only(
      samePageCheckGenerator(store),
      ([exam, examLogs, examAttemptLogs]) => {
        if (exam.closed) {
          router.getInstance().replace({ name: PageNames.EXAM_LIST });
          return;
        }
        const currentChannel = getChannelObject(store.state, exam.channel_id);
        if (!currentChannel) {
          router.replace({ name: PageNames.CONTENT_UNAVAILABLE });
          return;
        }

        const attemptLogs = {};

        if (store.state.core.session.user_id) {
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
          handleError(store, `Question number ${questionNumber} is not valid for this exam`);
        } else {
          const contentPromise = ContentNodeResource.getCollection({
            ids: questionSources.map(item => item.exercise_id),
          }).fetch();

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
                handleError(store, `This exam has no valid questions`);
              } else {
                const itemId = questions[questionNumber].itemId;

                const channelId = exam.channel_id;

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
                  content: contentState(contentNodeMap[questions[questionNumber].contentId]),
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
                  translator.$tr('currentExamPageTitle', {
                    currentExamTitle: pageState.exam.title,
                    currentChannelTitle: currentChannel.title,
                  })
                );
              }
            },
            error => {
              handleApiError(store, error);
            }
          );
        }
      },
      error => {
        handleApiError(store, error);
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
      new Promise(resolve => {
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
  const examLog = Object.assign({}, store.state.examLog, {
    completion_timestamp: now(),
  });
  examLog.closed = true;
  return ExamLogResource.getModel(examLog.id)
    .save(examLog)
    .catch(error => {
      handleApiError(store, error);
    });
}

export {
  setAndCheckChannels,
  contentState,
  showChannels,
  showTopicsChannel,
  showTopicsTopic,
  showTopicsContent,
  showContentUnavailable,
  triggerSearch,
  clearSearch,
  showSearch,
  showExam,
  showExamList,
  setAndSaveCurrentExamAttemptLog,
  closeExam,
  prepareLearnApp,
  updateContentNodeProgress,
};
