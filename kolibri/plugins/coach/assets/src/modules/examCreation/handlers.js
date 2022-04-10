import pickBy from 'lodash/pickBy';
import uniq from 'lodash/uniq';
import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
import {
  ContentNodeResource,
  BookmarksResource,
  ContentNodeSearchResource,
  ChannelResource,
} from 'kolibri.resources';
import { assessmentMetaDataState } from 'kolibri.coreVue.vuex.mappers';
import router from 'kolibri.coreVue.router';
import chunk from 'lodash/chunk';
import { PageNames } from '../../constants';
import { filterAndAnnotateContentList, fetchPracticeQuizzes } from './actions';

function showExamCreationPage(store, params) {
  const { contentList, bookmarksList, pageName, ancestors = [], searchResults = null } = params;
  return store.dispatch('loading').then(() => {
    store.commit('examCreation/SET_ANCESTORS', ancestors);
    store.commit('examCreation/SET_CONTENT_LIST', contentList);
    store.commit('examCreation/SET_BOOKMARKS_LIST', bookmarksList);
    if (searchResults) {
      store.commit('examCreation/SET_SEARCH_RESULTS', searchResults);
    }
    store.commit('SET_PAGE_NAME', pageName);
    store.dispatch('notLoading');
  });
}

export function showExamCreationRootPage(store, params) {
  return store.dispatch('loading').then(() => {
    return ChannelResource.fetchCollection({
      getParams: { available: true, has_exercise: true },
    }).then(channels => {
      const channelContentList = channels.map(channel => ({
        ...channel,
        id: channel.root,
        title: channel.name,
        kind: ContentNodeKinds.CHANNEL,
        is_leaf: false,
      }));
      store.commit('SET_TOOLBAR_ROUTE', {
        name: PageNames.EXAMS,
      });
      return showExamCreationPage(store, {
        classId: params.classId,
        contentList: channelContentList,
        pageName: PageNames.EXAM_CREATION_ROOT,
      });
    });
  });
}
export function showPracticeQuizCreationRootPage(store, params) {
  return fetchPracticeQuizzes().then(channels => {
    const channelContentList = channels.map(channel => ({
      ...channel,
      id: channel.id,
      title: channel.title,
      kind: ContentNodeKinds.CHANNEL,
      is_leaf: false,
    }));
    store.commit('SET_TOOLBAR_ROUTE', {
      name: PageNames.EXAMS,
    });
    return showExamCreationPage(store, {
      classId: params.classId,
      contentList: channelContentList,
      pageName: PageNames.EXAM_CREATION_PRACTICE_QUIZ,
    });
  });
}
export function showPracticeQuizCreationTopicPage(store, params) {
  return store.dispatch('loading').then(() => {
    const { topicId } = params;
    const topicNodePromise = ContentNodeResource.fetchModel({ id: topicId });
    const childNodesPromise = ContentNodeResource.fetchCollection({
      getParams: {
        parent: topicId,
        kind_in: [ContentNodeKinds.TOPIC, ContentNodeKinds.EXERCISE],
        contains_quiz: true,
      },
    });
    const loadRequirements = [topicNodePromise, childNodesPromise];

    return Promise.all(loadRequirements).then(([topicNode, childNodes]) => {
      return filterAndAnnotateContentList(childNodes).then(contentList => {
        store.commit('SET_TOOLBAR_ROUTE', {
          name: PageNames.EXAMS,
        });

        return showExamCreationPage(store, {
          classId: params.classId,
          contentList,
          pageName: PageNames.EXAM_CREATION_SELECT_PRACTICE_QUIZ_TOPIC,
          ancestors: [...topicNode.ancestors, topicNode],
        });
      });
    });
  });
}
export function showExamCreationTopicPage(store, params) {
  return store.dispatch('loading').then(() => {
    const { topicId } = params;
    const topicNodePromise = ContentNodeResource.fetchModel({ id: topicId });
    const childNodesPromise = ContentNodeResource.fetchCollection({
      getParams: {
        parent: topicId,
        kind_in: [ContentNodeKinds.TOPIC, ContentNodeKinds.EXERCISE],
      },
    });
    const loadRequirements = [topicNodePromise, childNodesPromise];

    return Promise.all(loadRequirements).then(([topicNode, childNodes]) => {
      return filterAndAnnotateContentList(childNodes).then(contentList => {
        store.commit('SET_TOOLBAR_ROUTE', {
          name: PageNames.EXAMS,
        });

        return showExamCreationPage(store, {
          classId: params.classId,
          contentList,
          pageName: PageNames.EXAM_CREATION_TOPIC,
          ancestors: [...topicNode.ancestors, topicNode],
        });
      });
    });
  });
}

export function showExamCreationBookmarksPage(store, params) {
  return store.dispatch('loading').then(() => {
    const { topicId } = params;
    const topicNodePromise = ContentNodeResource.fetchModel({ id: topicId });
    const childNodesPromise = ContentNodeResource.fetchCollection({
      getParams: {
        parent: topicId,
        kind_in: [ContentNodeKinds.TOPIC, ContentNodeKinds.VIDEO, ContentNodeKinds.EXERCISE],
      },
    });
    const loadRequirements = [topicNodePromise, childNodesPromise];

    return Promise.all(loadRequirements).then(([topicNode, childNodes]) => {
      return filterAndAnnotateContentList(childNodes).then(() => {
        store.commit('SET_TOOLBAR_ROUTE', {
          name: PageNames.EXAMS,
        });
        return showExamCreationPage(store, {
          classId: params.classId,
          bookmarksList: childNodes,
          pageName: PageNames.EXAM_CREATION_BOOKMARKS,
          ancestors: [...topicNode.ancestors, topicNode],
        });
      });
    });
  });
}
export function showExamCreationAllBookmarks(store) {
  return store.dispatch('loading').then(() => {
    getBookmarks().then(bookmarks => {
      return showExamCreationPage(store, {
        bookmarksList: bookmarks[0],
      });
    });
  });
}
function getBookmarks() {
  return BookmarksResource.fetchCollection()
    .then(bookmarks => bookmarks.map(bookmark => bookmark.contentnode_id))
    .then(contentNodeIds => {
      const chunkedContentNodeIds = chunk(contentNodeIds, 50); // Breaking contentNodeIds into lists no more than 50 in length
      // Now we will create an array of promises, each of which queries for the 50-id chunk
      const fetchPromises = chunkedContentNodeIds.map(idsChunk => {
        return ContentNodeResource.fetchCollection({
          getParams: {
            ids: idsChunk, // This filters only the ids we want
          },
        });
      });
      return Promise.all(fetchPromises);
    });
}

export function showExamCreationPreviewPage(store, params, fromRoute, query = {}) {
  const { classId, contentId } = params;
  return store.dispatch('loading').then(() => {
    return Promise.all([_prepExamContentPreview(store, classId, contentId)])
      .then(([contentNode]) => {
        const { searchTerm, ...otherQueryParams } = query;
        if (searchTerm) {
          store.commit('SET_TOOLBAR_ROUTE', {
            name: PageNames.EXAM_CREATION_SEARCH,
            params: {
              searchTerm,
            },
            query: otherQueryParams,
          });
        } else if (fromRoute && fromRoute.name === PageNames.EXAM_CREATION_TOPIC) {
          store.commit('SET_TOOLBAR_ROUTE', {
            name: PageNames.EXAM_CREATION_TOPIC,
            params: {
              topicId: contentNode.parent,
            },
          });
        } else {
          store.commit('SET_TOOLBAR_ROUTE', {
            name: PageNames.EXAM_CREATION_ROOT,
          });
        }
        store.dispatch('notLoading');
      })
      .catch(error => {
        store.dispatch('notLoading');
        return store.dispatch('handleApiError', error);
      });
  });
}
export function showPracticeQuizCreationPreviewPage(store, params) {
  const { classId, contentId } = params;
  return store.dispatch('loading').then(() => {
    return Promise.all([_prepPracticeQuizContentPreview(store, classId, contentId)])
      .then(([contentNode]) => {
        store.commit('SET_TOOLBAR_ROUTE', {
          name: PageNames.EXAM_CREATION_SELECT_PRACTICE_QUIZ_TOPIC,
          params: {
            topicId: contentNode.parent,
          },
        });
        store.dispatch('notLoading');
      })
      .catch(error => {
        store.dispatch('notLoading');
        return store.dispatch('handleApiError', error);
      });
  });
}

function _prepPracticeQuizContentPreview(store, classId, contentId) {
  return ContentNodeResource.fetchModel({ id: contentId }).then(
    contentNode => {
      const contentMetadata = assessmentMetaDataState(contentNode);
      store.commit('SET_TOOLBAR_ROUTE', {});
      store.commit('examCreation/SET_CURRENT_CONTENT_NODE', { ...contentNode });
      store.commit('examCreation/SET_PREVIEW_STATE', {
        questions: contentMetadata.assessmentIds,
        completionData: contentMetadata.masteryModel,
      });
      store.commit('SET_PAGE_NAME', PageNames.EXAM_CREATION_PRACTICE_QUIZ_PREVIEW);
      return contentNode;
    },
    error => {
      return store.dispatch('handleApiError', error);
    }
  );
}
function _prepExamContentPreview(store, classId, contentId) {
  return ContentNodeResource.fetchModel({ id: contentId }).then(
    contentNode => {
      const contentMetadata = assessmentMetaDataState(contentNode);
      store.commit('SET_TOOLBAR_ROUTE', {});
      store.commit('examCreation/SET_CURRENT_CONTENT_NODE', { ...contentNode });
      store.commit('examCreation/SET_PREVIEW_STATE', {
        questions: contentMetadata.assessmentIds,
        completionData: contentMetadata.masteryModel,
      });
      store.commit('SET_PAGE_NAME', PageNames.EXAM_CREATION_PREVIEW);
      return contentNode;
    },
    error => {
      return store.dispatch('handleApiError', error);
    }
  );
}

export function showExamCreationSearchPage(store, params, query = {}) {
  return store.dispatch('loading').then(() => {
    let kinds;
    if (query.kind) {
      kinds = [query.kind];
    } else {
      kinds = [ContentNodeKinds.EXERCISE, ContentNodeKinds.TOPIC];
    }

    store.commit('SET_TOOLBAR_ROUTE', {
      name: PageNames.EXAM_CREATION_ROOT,
      params: {},
    });

    return ContentNodeSearchResource.fetchCollection({
      getParams: {
        search: params.searchTerm,
        kind_in: kinds,
        ...pickBy({ channel_id: query.channel }),
      },
    }).then(results => {
      return filterAndAnnotateContentList(results.results).then(contentList => {
        const searchResults = {
          ...results,
          results: contentList,
          content_kinds: results.content_kinds.filter(kind =>
            [ContentNodeKinds.TOPIC, ContentNodeKinds.EXERCISE].includes(kind)
          ),
          contentIdsFetched: uniq(results.results.map(({ content_id }) => content_id)),
        };
        return showExamCreationPage(store, {
          classId: params.classId,
          contentList: contentList,
          pageName: PageNames.EXAM_CREATION_SEARCH,
          searchResults,
        });
      });
    });
  });
}

const creationPages = [
  PageNames.EXAM_CREATION_ROOT,
  PageNames.EXAM_CREATION_TOPIC,
  PageNames.EXAM_CREATION_PREVIEW,
  PageNames.EXAM_CREATION_SEARCH,
  PageNames.EXAM_CREATION_BOOKMARKS,
  PageNames.EXAM_CREATION_BOOKMARKS_MAIN,
];

export function showExamCreationQuestionSelectionPage(store, toRoute, fromRoute) {
  // if we got here from somewhere else, start over
  if (!creationPages.includes(fromRoute.name)) {
    router.replace({
      name: PageNames.EXAM_CREATION_ROOT,
      params: toRoute.params,
    });
  }
  store.commit('SET_PAGE_NAME', 'EXAM_CREATION_QUESTION_SELECTION');
  store.commit('SET_TOOLBAR_ROUTE', { name: fromRoute.name, params: fromRoute.params });
  store.dispatch('examCreation/updateSelectedQuestions');
}
