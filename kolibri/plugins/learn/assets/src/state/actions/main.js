import {
  ContentNodeResource,
  ContentNodeSlimResource,
  ContentNodeProgressResource,
  UserExamResource,
  ExamLogResource,
  ExamAttemptLogResource,
} from 'kolibri.resources';

import {
  getChannelObject,
  isUserLoggedIn,
  currentUserId,
  isCoach,
  isAdmin,
} from 'kolibri.coreVue.vuex.getters';
import {
  setChannelInfo,
  handleError,
  handleApiError,
  samePageCheckGenerator,
  getFacilities,
  getFacilityConfig,
} from 'kolibri.coreVue.vuex.actions';
import {
  createQuestionList,
  selectQuestionFromExercise,
  getExamReport,
  canViewExam,
  canViewExamReport,
} from 'kolibri.utils.exams';
import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
import { assessmentMetaDataState } from 'kolibri.coreVue.vuex.mappers';
import { now } from 'kolibri.utils.serverClock';
import ConditionalPromise from 'kolibri.lib.conditionalPromise';
import router from 'kolibri.coreVue.router';
import seededShuffle from 'kolibri.lib.seededshuffle';
import { createTranslator } from 'kolibri.utils.i18n';
import { getContentNodeThumbnail } from 'kolibri.utils.contentNode';
import tail from 'lodash/tail';
import { PageNames, ClassesPageNames } from '../../constants';

const translator = createTranslator('topicTreeExplorationPageTitles', {
  allChannels: 'All channels',
  topicsForChannelPageTitle: 'Topics - { currentChannelTitle }',
  currentTopicForChannelPageTitle: '{ currentTopicTitle } - { currentChannelTitle }',
  currentContentForChannelPageTitle: '{ currentContentTitle } - { currentChannelTitle }',
  contentUnavailablePageTitle: 'Content Unavailable',
  searchPageTitle: 'Search',
  examsListPageTitle: 'Exams',
  currentExamPageTitle: '{ currentExamTitle} - { currentChannelTitle }',
  examReportTitle: '{examTitle} report',
});

// adds progress, thumbnail, and breadcrumbs. normalizes pk/id and kind
function normalizeContentNode(node, ancestors = []) {
  const normalized = {
    ...node,
    // TODO change serializer to use ID
    id: node.pk,
    kind: node.parent ? node.kind : ContentNodeKinds.CHANNEL,
    thumbnail: getContentNodeThumbnail(node) || undefined,
    breadcrumbs: tail(ancestors).map(bc => ({ id: bc.pk, ...bc })),
    progress: Math.min(node.progress_fraction || 0, 1.0),
    copies_count: node.copies_count,
  };
  delete normalized.pk;
  return normalized;
}

export function contentState(data, next_content = [], ancestors = []) {
  return {
    next_content,
    ...normalizeContentNode(data, ancestors),
    ...assessmentMetaDataState(data),
  };
}

function _collectionState(data) {
  return data.map(
    item =>
      item.kind === ContentNodeKinds.TOPICS ? normalizeContentNode(item) : contentState(item)
  );
}

/**
 * Cache utility functions
 *
 * These methods are used to manipulate client side cache to reduce requests
 */

export function updateContentNodeProgress(channelId, contentId, progressFraction) {
  /*
   * Update the progress_fraction directly on the model object, so as to prevent having
   * to cache bust the model (and hence the entire collection), because some progress was
   * made on this ContentNode.
   */
  ContentNodeProgressResource.getModel(contentId).set({ progress_fraction: progressFraction });
}

export function setAndCheckChannels(store) {
  return setChannelInfo(store).then(
    channels => {
      if (!channels.length) {
        router.replace({ name: PageNames.CONTENT_UNAVAILABLE });
      }
      return channels;
    },
    error => {
      handleApiError(store, error);
      return error;
    }
  );
}

/**
 * Actions
 *
 * These methods are used to update client-side state
 */

export function showRoot(store) {
  const { memberships } = store.state.learnAppState;
  router.replace({
    name: memberships.length > 0 ? ClassesPageNames.ALL_CLASSES : PageNames.TOPICS_ROOT,
  });
}

export function showChannels(store) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.TOPICS_ROOT);
  store.dispatch('CORE_SET_TITLE', translator.$tr('allChannels'));

  setAndCheckChannels(store).then(
    channels => {
      if (!channels.length) {
        return;
      }
      const channelRootIds = channels.map(channel => channel.root);
      const include_fields = [];
      if (isCoach(store.state) || isAdmin(store.state)) {
        include_fields.push('num_coach_contents');
      }
      ContentNodeSlimResource.getCollection({ ids: channelRootIds, by_role: true, include_fields })
        .fetch()
        .then(channelCollection => {
          // we want them to be in the same order as the channels list
          const rootNodes = channels
            .map(channel => {
              const node = _collectionState(channelCollection).find(
                n => n.channel_id === channel.id
              );
              if (node) {
                node.thumbnail = channel.thumbnail;
                return node;
              }
            })
            .filter(Boolean);
          store.dispatch('SET_PAGE_STATE', { rootNodes });
          store.dispatch('CORE_SET_PAGE_LOADING', false);
          store.dispatch('CORE_SET_ERROR', null);
        });
    },
    error => {
      handleApiError(store, error);
      return error;
    }
  );
}

export function getCopies(store, contentId) {
  return new Promise((resolve, reject) => {
    ContentNodeResource.getCopies(contentId)
      .then(copies => resolve(copies))
      .catch(error => reject(error));
  });
}

export function showTopicsTopic(store, id, isRoot = false) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', isRoot ? PageNames.TOPICS_CHANNEL : PageNames.TOPICS_TOPIC);
  const include_fields = [];
  if (isCoach(store.state) || isAdmin(store.state)) {
    include_fields.push('num_coach_contents');
  }
  const promises = [
    ContentNodeSlimResource.getModel(id).fetch(), // the topic
    ContentNodeSlimResource.getCollection({
      parent: id,
      by_role: true,
      include_fields,
    }).fetch(), // the topic's children
    ContentNodeSlimResource.fetchAncestors(id), // the topic's ancestors
    setChannelInfo(store),
  ];

  ConditionalPromise.all(promises).only(
    samePageCheckGenerator(store),
    ([topic, children, ancestors]) => {
      const currentChannel = getChannelObject(store.state, topic.channel_id);
      if (!currentChannel) {
        router.replace({ name: PageNames.CONTENT_UNAVAILABLE });
        return;
      }
      if (isRoot) {
        topic.description = currentChannel.description;
      }
      const pageState = {
        isRoot,
        channel: currentChannel,
        topic: normalizeContentNode(topic, ancestors),
        contents: _collectionState(children),
      };
      store.dispatch('SET_PAGE_STATE', pageState);

      // Only load contentnode progress if the user is logged in
      if (isUserLoggedIn(store.state)) {
        const contentNodeIds = children.map(({ id }) => id);

        if (contentNodeIds.length > 0) {
          ContentNodeProgressResource.getCollection({ ids: contentNodeIds })
            .fetch()
            .then(progresses => {
              store.dispatch('SET_NODE_PROGRESS', progresses);
            });
        }
      }

      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);

      if (isRoot) {
        store.dispatch(
          'CORE_SET_TITLE',
          translator.$tr('topicsForChannelPageTitle', {
            currentChannelTitle: currentChannel.title,
          })
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

export function showTopicsChannel(store, id) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.TOPICS_CHANNEL);
  showTopicsTopic(store, id, true);
}

export function showTopicsContent(store, id) {
  store.dispatch('SET_EMPTY_LOGGING_STATE');
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.TOPICS_CONTENT);

  const promises = [
    ContentNodeResource.getModel(id).fetch(),
    ContentNodeResource.fetchNextContent(id),
    ContentNodeResource.fetchAncestors(id),
    setChannelInfo(store),
  ];
  ConditionalPromise.all(promises).only(
    samePageCheckGenerator(store),
    ([content, nextContent, ancestors]) => {
      const currentChannel = getChannelObject(store.state, content.channel_id);
      if (!currentChannel) {
        router.replace({ name: PageNames.CONTENT_UNAVAILABLE });
        return;
      }
      store.dispatch('SET_PAGE_STATE', {
        content: contentState(content, nextContent, ancestors),
        channel: currentChannel,
      });
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);
      store.dispatch(
        'CORE_SET_TITLE',
        translator.$tr('currentContentForChannelPageTitle', {
          currentContentTitle: content.title,
          currentChannelTitle: currentChannel.title,
        })
      );
    },
    error => {
      handleApiError(store, error);
    }
  );
}

export function triggerSearch(store, searchTerm) {
  if (!searchTerm) {
    return clearSearch(store, searchTerm);
  }

  return ContentNodeResource.getPagedCollection({ search: searchTerm })
    .fetch()
    .then(results => {
      const contents = _collectionState(results);
      store.dispatch('SET_PAGE_STATE', {
        searchTerm,
        contents,
      });
      store.dispatch('CORE_SET_PAGE_LOADING', false);

      const contentIds = contents
        .filter(
          content =>
            content.kind !== ContentNodeKinds.TOPIC && content.kind !== ContentNodeKinds.CHANNEL
        )
        .map(content => content.content_id);
      if (contentIds.length) {
        ContentNodeResource.getCopiesCount({
          content_ids: contentIds,
        })
          .fetch()
          .then(copiesCount => {
            const updatedContents = contents.map(content => {
              const updatedContent = content;
              const matchingContent = copiesCount.find(
                copyCount => copyCount.content_id === content.content_id
              );
              if (matchingContent) {
                updatedContent.copies_count = matchingContent.count;
              }
              return updatedContent;
            });
            store.dispatch('SET_CONTENT', updatedContents);
          })
          .catch(error => handleApiError(store, error));
      }
    })
    .catch(error => {
      handleApiError(store, error);
    });
}

export function clearSearch(store, searchTerm = '') {
  store.dispatch('SET_PAGE_STATE', {
    topics: [],
    contents: [],
    searchTerm,
  });
}

export function showContentUnavailable(store) {
  store.dispatch('SET_PAGE_NAME', PageNames.CONTENT_UNAVAILABLE);
  store.dispatch('SET_PAGE_STATE', {});
  store.dispatch('CORE_SET_PAGE_LOADING', false);
  store.dispatch('CORE_SET_ERROR', null);
  store.dispatch('CORE_SET_TITLE', translator.$tr('contentUnavailablePageTitle'));
}

export function showSearch(store, searchTerm) {
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

export function calcQuestionsAnswered(attemptLogs) {
  let questionsAnswered = 0;
  Object.keys(attemptLogs).forEach(key => {
    Object.keys(attemptLogs[key]).forEach(innerKey => {
      questionsAnswered += attemptLogs[key][innerKey].answer ? 1 : 0;
    });
  });
  return questionsAnswered;
}

export function showExamReport(store, classId, examId, questionNumber, questionInteraction) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', ClassesPageNames.EXAM_REPORT_VIEWER);

  const userId = currentUserId(store.state);
  const examReportPromise = getExamReport(
    store,
    examId,
    userId,
    questionNumber,
    questionInteraction
  );
  ConditionalPromise.all([examReportPromise]).then(
    ([examReport]) => {
      if (canViewExamReport(examReport.exam, examReport.examLog)) {
        store.dispatch('SET_PAGE_STATE', examReport);
        store.dispatch('CORE_SET_ERROR', null);
        store.dispatch(
          'CORE_SET_TITLE',
          translator.$tr('examReportTitle', {
            examTitle: examReport.exam.title,
          })
        );
        store.dispatch('CORE_SET_PAGE_LOADING', false);
      } else {
        router.replace({
          name: ClassesPageNames.CLASS_ASSIGNMENTS,
          params: { classId },
        });
      }
    },
    () =>
      router.replace({
        name: ClassesPageNames.CLASS_ASSIGNMENTS,
        params: { classId },
      })
  );
}
export function showExam(store, classId, examId, questionNumber) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', ClassesPageNames.EXAM_VIEWER);
  // Reset examAttemptLogs, so that it will not merge into another exam.
  store.dispatch('RESET_EXAM_ATTEMPT_LOGS');
  const userId = currentUserId(store.state);
  const examParams = { user: userId, exam: examId };

  if (!userId) {
    store.dispatch('CORE_SET_ERROR', 'You must be logged in as a learner to view this page');
    store.dispatch('CORE_SET_PAGE_LOADING', false);
  } else {
    questionNumber = Number(questionNumber); // eslint-disable-line no-param-reassign

    const promises = [
      UserExamResource.getModel(examId).fetch(),
      ExamLogResource.getCollection(examParams).fetch(),
      ExamAttemptLogResource.getCollection(examParams).fetch(),
      setAndCheckChannels(store),
    ];
    ConditionalPromise.all(promises).only(
      samePageCheckGenerator(store),
      ([exam, examLogs, examAttemptLogs]) => {
        const currentChannel = getChannelObject(store.state, exam.channel_id);
        if (!currentChannel) {
          return router.replace({ name: PageNames.CONTENT_UNAVAILABLE });
        }

        // Local copy of exam attempt logs
        const attemptLogs = {};

        if (examLogs.length > 0 && examLogs.some(log => !log.closed)) {
          store.dispatch('SET_EXAM_LOG', examLogs.find(log => !log.closed));
        } else {
          ExamLogResource.createModel({ ...examParams, closed: false })
            .save()
            .then(newExamLog => {
              store.dispatch('SET_EXAM_LOG', newExamLog);
              return ExamLogResource.unCacheCollection(examParams);
            });
        }

        if (!canViewExam(exam, store.state.examLog)) {
          return router
            .getInstance()
            .replace({ name: ClassesPageNames.CLASS_ASSIGNMENTS, params: { classId } });
        }
        // Sort through all the exam attempt logs retrieved and organize them into objects
        // keyed first by content_id and then item id under that.
        examAttemptLogs.forEach(log => {
          const { content_id, item } = log;
          if (!attemptLogs[content_id]) {
            attemptLogs[content_id] = {};
          }
          attemptLogs[content_id][item] = { ...log };
        });

        // Sort through all the exam attempt logs retrieved and organize them into objects
        // keyed first by content_id and then item id under that.
        examAttemptLogs.forEach(log => {
          const { content_id, item } = log;
          if (!attemptLogs[content_id]) {
            attemptLogs[content_id] = {};
          }
          attemptLogs[content_id][item] = { ...log };
        });

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
                  exam,
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

export function setAndSaveCurrentExamAttemptLog(
  store,
  contentId,
  itemId,
  currentAttemptLog,
  examId
) {
  // As soon as this has happened, we should clear any previous cache for the
  // UserExamResource - as that data has now changed.
  UserExamResource.clearCache();

  store.dispatch('SET_EXAM_ATTEMPT_LOGS', {
    [contentId]: {
      [itemId]: currentAttemptLog,
    },
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
  attributes.user = currentUserId(store.state);
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
          [contentId]: {
            [itemId]: log,
          },
        });
        const questionsAnswered = calcQuestionsAnswered(store.state.examAttemptLogs);
        store.dispatch('SET_QUESTIONS_ANSWERED', questionsAnswered);
        const examAttemptLogCollection = ExamAttemptLogResource.getCollection({
          user: currentUserId(store.state),
          exam: examId,
        });
        // Add this attempt log to the Collection for future caching.
        examAttemptLogCollection.set(examAttemptLogModel);
        resolve();
      }),
    () => {
      this.$router.replace({ name: ClassesPageNames.CLASS_ASSIGNMENTS });
    }
  );
}

export function closeExam(store) {
  const { examLog } = store.state;
  return ExamLogResource.getModel(examLog.id)
    .save({
      ...examLog,
      completion_timestamp: now(),
      closed: true,
    })
    .then(UserExamResource.clearCache())
    .catch(error => {
      handleApiError(store, error);
    });
}

export function setFacilitiesAndConfig(store) {
  return getFacilities(store).then(() => {
    return getFacilityConfig(store);
  });
}
