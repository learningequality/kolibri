import { assessmentMetaDataState } from 'kolibri.coreVue.vuex.mappers';
import { ContentNodeResource, ContentNodeSlimResource } from 'kolibri.resources';
import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
import { getContentNodeThumbnail } from 'kolibri.utils.contentNode';
import { LessonsPageNames } from '../../constants/lessonsConstants';

function showResourceSelectionPage(
  store,
  classId,
  lessonId,
  contentList,
  pageName,
  ancestors = []
) {
  const pendingSelections = store.state.lessonSummary.workingResources || [];
  const cache = store.state.lessonSummary.resourceCache || {};
  const lessonSummaryState = {
    currentLesson: {},
    // contains all selections, including those that haven't been committed to server
    workingResources: pendingSelections,
    resourceCache: cache,
  };
  store.commit('CORE_SET_PAGE_LOADING', true);
  store.commit('SET_TOOLBAR_ROUTE', {});
  store.commit('lessonSummary/SET_STATE', lessonSummaryState);
  store.commit('lessonSummary/resources/SET_STATE', {
    contentList: [],
    ancestors: [],
  });

  const loadRequirements = [
    store.dispatch('lessonSummary/updateCurrentLesson', lessonId),
    store.dispatch('setClassState', classId),
  ];
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

      const getResourceAncestors = store.state.lessonSummary.workingResources.map(resourceId =>
        ContentNodeResource.fetchAncestors(resourceId)
      );

      return Promise.all(getResourceAncestors).then(
        // there has to be a better way
        resourceAncestors => {
          resourceAncestors.forEach(ancestorArray =>
            ancestorArray.forEach(ancestor => {
              if (ancestorCounts[ancestor.id]) {
                ancestorCounts[ancestor.id]++;
              } else {
                ancestorCounts[ancestor.id] = 1;
              }
            })
          );
          store.commit('lessonSummary/resources/SET_ANCESTOR_COUNTS', ancestorCounts);
          // carry pendingSelections over from other interactions in this modal
          store.commit('lessonSummary/resources/SET_CONTENT_LIST', contentList);
          store.commit('SET_PAGE_NAME', pageName);
          store.commit('SET_TOOLBAR_ROUTE', {
            name: LessonsPageNames.SUMMARY,
          });
          store.commit('CORE_SET_PAGE_LOADING', false);
        }
      );
    },
    error => {
      store.commit('CORE_SET_PAGE_LOADING', false);
      return store.dispatch('handleApiError', error);
    }
  );
}

export function showLessonResourceSelectionRootPage(store, params) {
  const { classId, lessonId } = params;
  store.commit('CORE_SET_PAGE_LOADING', true);
  const channelContentList = store.getters.getChannels.map(channel => {
    return {
      id: channel.root_id,
      description: channel.description,
      title: channel.title,
      thumbnail: channel.thumbnail,
      num_coach_contents: channel.num_coach_contents,
      kind: ContentNodeKinds.CHANNEL,
    };
  });

  return showResourceSelectionPage(
    store,
    classId,
    lessonId,
    channelContentList,
    LessonsPageNames.SELECTION_ROOT
  );
}

export function showLessonResourceSelectionTopicPage(store, params) {
  const { classId, lessonId, topicId } = params;
  // IDEA should probably have both selection pages set loading themselves
  store.commit('CORE_SET_PAGE_LOADING', true);
  const loadRequirements = [
    ContentNodeResource.fetchModel({ id: topicId }),
    ContentNodeResource.fetchCollection({ getParams: { parent: topicId } }),
    ContentNodeSlimResource.fetchAncestors(topicId),
  ];

  return Promise.all(loadRequirements).then(
    ([topicNode, childNodes, ancestors]) => {
      const topicAncestors = [...ancestors, topicNode];
      // TODO state mapper
      const topicContentList = childNodes.map(node => {
        return {
          id: node.id,
          content_id: node.content_id,
          channel_id: node.channel_id,
          description: node.description,
          num_coach_contents: node.num_coach_contents,
          title: node.title,
          thumbnail: getContentNodeThumbnail(node),
          kind: node.kind,
        };
      });

      return showResourceSelectionPage(
        store,
        classId,
        lessonId,
        topicContentList,
        LessonsPageNames.SELECTION,
        topicAncestors
      );
    },
    error => {
      store.commit('CORE_SET_PAGE_LOADING', false);
      return store.dispatch('handleApiError', error);
    }
  );
}

export function showLessonResourceContentPreview(store, params) {
  const { classId, lessonId, contentId } = params;
  store.commit('CORE_SET_PAGE_LOADING', true);
  _prepLessonContentPreview(store, classId, lessonId, contentId).then(() => {
    store.commit('SET_TOOLBAR_ROUTE', {
      name: LessonsPageNames.RESOURCE_USER_SUMMARY,
    });
    store.commit('CORE_SET_PAGE_LOADING', false);
  });
}

export function showLessonSelectionContentPreview(store, params) {
  const { classId, lessonId, contentId } = params;
  store.commit('CORE_SET_PAGE_LOADING', true);
  const pendingSelections = store.state.lessonSummary.workingResources || [];
  return Promise.all([
    _prepLessonContentPreview(store, classId, lessonId, contentId),
    store.dispatch('lessonSummary/updateCurrentLesson', lessonId),
  ])
    .then(([contentNode, lesson]) => {
      // TODO state mapper
      const preselectedResources = lesson.resources.map(resourceObj => resourceObj.contentnode_id);
      store.commit('SET_TOOLBAR_ROUTE', {
        name: LessonsPageNames.SELECTION,
        params: {
          topicId: contentNode.parent,
        },
      });
      store.commit(
        'lessonSummary/SET_WORKING_RESOURCES',
        pendingSelections.length ? pendingSelections : preselectedResources
      );
      store.commit('CORE_SET_PAGE_LOADING', false);
    })
    .catch(error => {
      store.commit('CORE_SET_PAGE_LOADING', false);
      return store.dispatch('handleApiError', error);
    });
}

function _prepLessonContentPreview(store, classId, lessonId, contentId) {
  const cache = store.state.lessonSummary.resourceCache || {};
  const lessonSummaryState = {
    currentContentNode: {},
    toolbarRoute: {},
    // only exist if exercises
    workingResources: null,
    resourceCache: cache,
  };
  const previewState = {
    questions: null,
    completionData: null,
  };
  return ContentNodeResource.fetchModel({ id: contentId }).then(
    contentNode => {
      // set up intial pageState
      const contentMetadata = assessmentMetaDataState(contentNode);
      lessonSummaryState.currentContentNode = contentNode;
      previewState.questions = contentMetadata.assessmentIds;
      previewState.completionData = contentMetadata.masteryModel;
      store.commit('lessonSummary/SET_STATE', lessonSummaryState);
      store.commit('lessonSummary/resources/SET_PREVIEW_STATE', previewState);
      store.commit('SET_PAGE_NAME', LessonsPageNames.CONTENT_PREVIEW);
      return contentNode;
    },
    error => {
      return store.dispatch('handleApiError', error);
    }
  );
}
