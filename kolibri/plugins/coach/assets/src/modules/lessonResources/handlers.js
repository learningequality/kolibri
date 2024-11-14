import pickBy from 'lodash/pickBy';
import BookmarksResource from 'kolibri-common/apiResources/BookmarksResource';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import ContentNodeSearchResource from 'kolibri-common/apiResources/ContentNodeSearchResource';
import { ContentNodeKinds } from 'kolibri/constants';
import chunk from 'lodash/chunk';
import useUser from 'kolibri/composables/useUser';
import { get } from '@vueuse/core';
import { PageNames } from '../../constants';

async function showResourceSelectionPage(store, params) {
  const {
    lessonId,
    contentList,
    pageName,
    bookmarksList,
    ancestors = [],
    descendantCounts = [],
  } = params;
  const pendingSelections = store.state.lessonSummary.workingResources || [];
  const cache = store.state.lessonSummary.resourceCache || {};
  const initClassInfoPromise = store.dispatch('initClassInfo', params.classId);
  const { isSuperuser } = useUser();
  const getFacilitiesPromise =
    get(isSuperuser) && store.state.core.facilities.length === 0
      ? store.dispatch('getFacilities').catch(() => {})
      : Promise.resolve();

  await Promise.all([initClassInfoPromise, getFacilitiesPromise]);
  const lessonSummaryState = {
    currentLesson: {},
    // contains all selections, including those that haven't been committed to server
    workingResources: pendingSelections,
    resourceCache: cache,
  };
  return store.dispatch('loading').then(() => {
    store.commit('SET_TOOLBAR_ROUTE', {});
    store.commit('lessonSummary/SET_STATE', lessonSummaryState);
    store.commit('lessonSummary/resources/SET_BOOKMARKS_LIST', bookmarksList);
    store.commit('lessonSummary/resources/SET_STATE', {
      contentList: [],
      ancestors,
    });

    if (lessonId) {
      const loadRequirements = [store.dispatch('lessonSummary/updateCurrentLesson', lessonId)];
      return Promise.all(loadRequirements).then(([currentLesson]) => {
        const resourceIds = currentLesson.resources.map(resourceObj => resourceObj.contentnode_id);
        const setResourceCachePromise = store.dispatch(
          'lessonSummary/getResourceCache',
          resourceIds,
        );
        // contains selections that were commited to server prior to opening this page
        if (!pendingSelections.length) {
          store.commit('lessonSummary/SET_WORKING_RESOURCES', currentLesson.resources);
        }

        if (ancestors.length) {
          store.commit('lessonSummary/resources/SET_ANCESTORS', ancestors);
        }

        const descendantCountsObject = {};
        for (const descendantCount of descendantCounts.data || descendantCounts) {
          descendantCountsObject[descendantCount.id] = descendantCount.on_device_resources;
        }

        store.commit('lessonSummary/resources/SET_DESCENDANT_COUNTS', descendantCountsObject);

        // carry pendingSelections over from other interactions in this modal
        store.commit('lessonSummary/resources/SET_CONTENT_LIST', contentList);
        if (params.searchResults) {
          store.commit('lessonSummary/resources/SET_SEARCH_RESULTS', params.searchResults);
        }
        store.commit('SET_PAGE_NAME', pageName);
        if (pageName === PageNames.LESSON_RESOURCE_SELECTION_SEARCH) {
          store.commit('SET_TOOLBAR_ROUTE', {
            name: PageNames.LESSON_RESOURCE_SELECTION_ROOT,
          });
        } else {
          store.commit('SET_TOOLBAR_ROUTE', {
            name: PageNames.LESSON_SUMMARY,
          });
        }
        return setResourceCachePromise.then(() => {
          store.dispatch('notLoading');
        });
      });
    }
  });
}

export function showLessonResourceSelectionRootPage(store, params) {
  return store.dispatch('loading').then(() => {
    const channelContentList = store.getters.getChannels.map(channel => {
      return {
        ...channel,
        id: channel.root_id,
        kind: ContentNodeKinds.CHANNEL,
        is_leaf: false,
      };
    });
    return ContentNodeResource.fetchDescendantCounts({ parent__isnull: true }).then(
      descendantCounts => {
        return showResourceSelectionPage(store, {
          classId: params.classId,
          lessonId: params.lessonId,
          contentList: channelContentList,
          pageName: PageNames.LESSON_RESOURCE_SELECTION_ROOT,
          descendantCounts,
        });
      },
    );
  });
}

export function showLessonResourceSelectionTopicPage(store, params) {
  // IDEA should probably have both selection pages set loading themselves
  return store.dispatch('loading').then(() => {
    const { topicId } = params;
    const loadRequirements = [
      ContentNodeResource.fetchModel({ id: topicId }),
      ContentNodeResource.fetchCollection({ getParams: { parent: topicId } }),
      ContentNodeResource.fetchDescendantCounts({ parent: topicId }),
    ];

    return Promise.all(loadRequirements).then(([topicNode, childNodes, descendantCounts]) => {
      return showResourceSelectionPage(store, {
        classId: params.classId,
        lessonId: params.lessonId,
        contentList: childNodes,
        pageName: PageNames.LESSON_RESOURCE_SELECTION,
        descendantCounts,
        ancestors: [...topicNode.ancestors, topicNode],
      });
    });
  });
}
export function showLessonResourceBookmarks(store, params) {
  return store.dispatch('loading').then(() => {
    const { topicId } = params;
    const loadRequirements = [
      ContentNodeResource.fetchModel({ id: topicId }),
      ContentNodeResource.fetchCollection({ getParams: { parent: topicId } }),
    ];

    return Promise.all(loadRequirements).then(([topicNode, childNodes]) => {
      return showResourceSelectionPage(store, {
        classId: params.classId,
        lessonId: params.lessonId,
        bookmarksList: childNodes,
        pageName: PageNames.LESSON_RESOURCE_SELECTION,
        ancestors: [...topicNode.ancestors, topicNode],
      });
    });
  });
}
export function showLessonResourceBookmarksMain(store, params) {
  return store.dispatch('loading').then(() => {
    getBookmarks().then(bookmarks => {
      return showResourceSelectionPage(store, {
        classId: params.classId,
        lessonId: params.lessonId,
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
export async function showLessonResourceContentPreview(store, params) {
  const { classId, lessonId, contentId } = params;
  const initClassInfoPromise = store.dispatch('initClassInfo', classId);
  const { isSuperuser } = useUser();
  const getFacilitiesPromise =
    get(isSuperuser) && store.state.core.facilities.length === 0
      ? store.dispatch('getFacilities').catch(() => {})
      : Promise.resolve();

  await Promise.all([initClassInfoPromise, getFacilitiesPromise]);
  return store.dispatch('loading').then(() => {
    return _prepLessonContentPreview(store, classId, lessonId, contentId).then(() => {
      store.dispatch('notLoading');
    });
  });
}

export async function showLessonSelectionContentPreview(store, params, query = {}) {
  const { classId, lessonId, contentId } = params;
  const initClassInfoPromise = store.dispatch('initClassInfo', classId);
  const { isSuperuser } = useUser();
  const getFacilitiesPromise =
    get(isSuperuser) && store.state.core.facilities.length === 0
      ? store.dispatch('getFacilities').catch(() => {})
      : Promise.resolve();

  await Promise.all([initClassInfoPromise, getFacilitiesPromise]);
  return store.dispatch('loading').then(() => {
    const pendingSelections = store.state.lessonSummary.workingResources || [];
    return Promise.all([
      _prepLessonContentPreview(store, classId, lessonId, contentId),
      store.dispatch('lessonSummary/updateCurrentLesson', lessonId),
    ])
      .then(([contentNode, lesson]) => {
        // TODO state mapper
        const preselectedResources = lesson.resources;
        const { searchTerm, ...otherQueryParams } = query;
        if (searchTerm) {
          store.commit('SET_TOOLBAR_ROUTE', {
            name: PageNames.LESSON_RESOURCE_SELECTION_SEARCH,
            params: {
              searchTerm,
            },
            query: otherQueryParams,
          });
        } else {
          store.commit('SET_TOOLBAR_ROUTE', {
            name: PageNames.LESSON_RESOURCE_SELECTION,
            params: {
              topicId: contentNode.parent,
            },
          });
        }

        store.commit(
          'lessonSummary/SET_WORKING_RESOURCES',
          pendingSelections.length ? pendingSelections : preselectedResources,
        );
        store.dispatch('notLoading');
      })
      .catch(error => {
        store.dispatch('notLoading');
        return store.dispatch('handleApiError', { error, reloadOnReconnect: true });
      });
  });
}

function _prepLessonContentPreview(store, classId, lessonId, contentId) {
  const cache = store.state.lessonSummary.resourceCache || {};
  return ContentNodeResource.fetchModel({
    id: contentId,
    getParams: { no_available_filtering: true },
  }).then(
    contentNode => {
      store.commit('lessonSummary/SET_STATE', {
        toolbarRoute: {},
        // only exist if exercises
        workingResources: null,
        resourceCache: cache,
      });

      store.commit('lessonSummary/resources/SET_CURRENT_CONTENT_NODE', contentNode);

      if (contentNode.assessmentmetadata) {
        store.commit('lessonSummary/resources/SET_PREVIEW_STATE', {
          questions: contentNode.assessmentmetadata.assessment_item_ids,
          completionData: contentNode.assessmentmetadata.mastery_model,
        });
      }

      store.commit('SET_PAGE_NAME', PageNames.LESSON_CONTENT_PREVIEW);
      return contentNode;
    },
    error => {
      return store.dispatch('handleApiError', { error, reloadOnReconnect: true });
    },
  );
}

export function showLessonResourceSearchPage(store, params, query = {}) {
  return store.dispatch('loading').then(() => {
    return ContentNodeSearchResource.fetchCollection({
      getParams: {
        search: params.searchTerm,
        ...pickBy({
          kind: query.kind,
          channel_id: query.channel,
        }),
      },
    }).then(results => {
      return showResourceSelectionPage(store, {
        classId: params.classId,
        lessonId: params.lessonId,
        contentList: results.results,
        searchResults: results,
        pageName: PageNames.LESSON_RESOURCE_SELECTION_SEARCH,
      });
    });
  });
}
