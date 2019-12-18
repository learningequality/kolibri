import pickBy from 'lodash/pickBy';
import { assessmentMetaDataState } from 'kolibri.coreVue.vuex.mappers';
import {
  ContentNodeResource,
  ContentNodeSlimResource,
  ContentNodeSearchResource,
} from 'kolibri.resources';
import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
import { getContentNodeThumbnail } from 'kolibri.utils.contentNode';
import { LessonsPageNames } from '../../constants/lessonsConstants';

function showResourceSelectionPage(store, params) {
  const { lessonId, contentList, pageName, ancestors = [] } = params;
  const pendingSelections = store.state.lessonSummary.workingResources || [];
  const cache = store.state.lessonSummary.resourceCache || {};
  const lessonSummaryState = {
    currentLesson: {},
    // contains all selections, including those that haven't been committed to server
    workingResources: pendingSelections,
    resourceCache: cache,
  };
  return store.dispatch('loading').then(() => {
    store.commit('SET_TOOLBAR_ROUTE', {});
    store.commit('lessonSummary/SET_STATE', lessonSummaryState);
    store.commit('lessonSummary/resources/SET_STATE', {
      contentList: [],
      ancestors: [],
    });

    const loadRequirements = [store.dispatch('lessonSummary/updateCurrentLesson', lessonId)];
    return Promise.all(loadRequirements).then(
      ([currentLesson]) => {
        // TODO make a state mapper
        // contains selections that were commited to server prior to opening this page
        if (!pendingSelections.length) {
          const preselectedResources = currentLesson.resources.map(
            resourceObj => resourceObj.contentnode_id
          );
          store.commit('lessonSummary/SET_WORKING_RESOURCES', preselectedResources);
        }

        if (ancestors.length) {
          store.commit('lessonSummary/resources/SET_ANCESTORS', ancestors);
        }

        const ancestorCounts = {};

        let getResourceAncestors;
        // Don't get ancestors if at the Channels page
        if (pageName === LessonsPageNames.SELECTION_ROOT) {
          getResourceAncestors = [];
        } else {
          getResourceAncestors = store.state.lessonSummary.workingResources.map(resourceId =>
            ContentNodeSlimResource.fetchAncestors(resourceId)
          );
        }

        // store ancestor ids to get their descendants later
        const ancestorIds = new Set();

        return Promise.all(getResourceAncestors).then(
          // there has to be a better way
          resourceAncestors => {
            resourceAncestors.forEach(ancestorArray =>
              ancestorArray.forEach(ancestor => {
                ancestorIds.add(ancestor.id);
                if (ancestorCounts[ancestor.id]) {
                  ancestorCounts[ancestor.id].count++;
                } else {
                  ancestorCounts[ancestor.id] = {};
                  // total number of working/added resources
                  ancestorCounts[ancestor.id].count = 1;
                  // total number of descendants
                  ancestorCounts[ancestor.id].total = 0;
                }
              })
            );
            ContentNodeResource.fetchDescendants(Array.from(ancestorIds)).then(nodes => {
              nodes.entity.forEach(node => {
                // exclude topics from total resource calculation
                if (node.kind !== ContentNodeKinds.TOPIC) {
                  ancestorCounts[node.ancestor_id].total++;
                }
              });
              store.commit('lessonSummary/resources/SET_ANCESTOR_COUNTS', ancestorCounts);
              // carry pendingSelections over from other interactions in this modal
              store.commit('lessonSummary/resources/SET_CONTENT_LIST', contentList);
              if (params.searchResults) {
                store.commit('lessonSummary/resources/SET_SEARCH_RESULTS', params.searchResults);
              }
              store.commit('SET_PAGE_NAME', pageName);
              if (pageName === LessonsPageNames.SELECTION_SEARCH) {
                store.commit('SET_TOOLBAR_ROUTE', {
                  name: LessonsPageNames.SELECTION_ROOT,
                });
              } else {
                store.commit('SET_TOOLBAR_ROUTE', {
                  name: LessonsPageNames.SUMMARY,
                });
              }
              store.dispatch('notLoading');
            });
          }
        );
      },
      error => {
        store.dispatch('notLoading');
        return store.dispatch('handleApiError', error);
      }
    );
  });
}

export function showLessonResourceSelectionRootPage(store, params) {
  return store.dispatch('loading').then(() => {
    const channelContentList = store.getters.getChannels.map(channel => {
      return {
        ...channel,
        id: channel.root_id,
        kind: ContentNodeKinds.CHANNEL,
      };
    });

    return showResourceSelectionPage(store, {
      classId: params.classId,
      lessonId: params.lessonId,
      contentList: channelContentList,
      pageName: LessonsPageNames.SELECTION_ROOT,
    });
  });
}

export function showLessonResourceSelectionTopicPage(store, params) {
  // IDEA should probably have both selection pages set loading themselves
  return store.dispatch('loading').then(() => {
    const { topicId } = params;
    const loadRequirements = [
      ContentNodeResource.fetchModel({ id: topicId }),
      ContentNodeResource.fetchCollection({ getParams: { parent: topicId } }),
      ContentNodeSlimResource.fetchAncestors(topicId),
    ];

    return Promise.all(loadRequirements).then(([topicNode, childNodes, ancestors]) => {
      const topicContentList = childNodes.map(node => {
        return { ...node, thumbnail: getContentNodeThumbnail(node) };
      });

      return showResourceSelectionPage(store, {
        classId: params.classId,
        lessonId: params.lessonId,
        contentList: topicContentList,
        pageName: LessonsPageNames.SELECTION,
        ancestors: [...ancestors, topicNode],
      });
    });
  });
}

export function showLessonResourceContentPreview(store, params) {
  const { classId, lessonId, contentId } = params;
  return store.dispatch('loading').then(() => {
    return _prepLessonContentPreview(store, classId, lessonId, contentId).then(() => {
      store.dispatch('notLoading');
    });
  });
}

export function showLessonSelectionContentPreview(store, params, query = {}) {
  const { classId, lessonId, contentId } = params;
  return store.dispatch('loading').then(() => {
    const pendingSelections = store.state.lessonSummary.workingResources || [];
    return Promise.all([
      _prepLessonContentPreview(store, classId, lessonId, contentId),
      store.dispatch('lessonSummary/updateCurrentLesson', lessonId),
    ])
      .then(([contentNode, lesson]) => {
        // TODO state mapper
        const preselectedResources = lesson.resources.map(({ contentnode_id }) => contentnode_id);

        const { searchTerm, ...otherQueryParams } = query;
        if (searchTerm) {
          store.commit('SET_TOOLBAR_ROUTE', {
            name: LessonsPageNames.SELECTION_SEARCH,
            params: {
              searchTerm,
            },
            query: otherQueryParams,
          });
        } else {
          store.commit('SET_TOOLBAR_ROUTE', {
            name: LessonsPageNames.SELECTION,
            params: {
              topicId: contentNode.parent,
            },
          });
        }

        store.commit(
          'lessonSummary/SET_WORKING_RESOURCES',
          pendingSelections.length ? pendingSelections : preselectedResources
        );
        store.dispatch('notLoading');
      })
      .catch(error => {
        store.dispatch('notLoading');
        return store.dispatch('handleApiError', error);
      });
  });
}

function _prepLessonContentPreview(store, classId, lessonId, contentId) {
  const cache = store.state.lessonSummary.resourceCache || {};
  return ContentNodeResource.fetchModel({ id: contentId }).then(
    contentNode => {
      const contentMetadata = assessmentMetaDataState(contentNode);
      store.commit('lessonSummary/SET_STATE', {
        toolbarRoute: {},
        // only exist if exercises
        workingResources: null,
        resourceCache: cache,
      });
      store.commit('lessonSummary/resources/SET_CURRENT_CONTENT_NODE', contentNode);
      store.commit('lessonSummary/resources/SET_PREVIEW_STATE', {
        questions: contentMetadata.assessmentIds,
        completionData: contentMetadata.masteryModel,
      });
      store.commit('SET_PAGE_NAME', LessonsPageNames.CONTENT_PREVIEW);
      return contentNode;
    },
    error => {
      return store.dispatch('handleApiError', error);
    }
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
        pageName: LessonsPageNames.SELECTION_SEARCH,
      });
    });
  });
}
