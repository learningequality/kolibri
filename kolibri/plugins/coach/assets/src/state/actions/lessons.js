import { LessonsPageNames } from '../../lessonsConstants';
import { getChannels } from 'kolibri.coreVue.vuex.getters';
import { assessmentMetaDataState } from 'kolibri.coreVue.vuex.mappers';
import { setClassState } from './main';
import { LearnerGroupResource, LessonResource, ContentNodeResource } from 'kolibri.resources';
import LessonReportResource from '../../apiResources/lessonReport';
import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
import { createTranslator } from 'kolibri.utils.i18n';

const translator = createTranslator('lessonsPageTitles', {
  lessons: 'Lessons',
  selectResources: 'Select resources',
});

// Show the Lessons Root Page, where all the Lessons are listed for a given Classroom
export function showLessonsRootPage(store, classId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_STATE', {
    lessons: [],
    learnerGroups: [],
  });
  const loadRequirements = [
    // Fetch learner groups for the New Lesson Modal
    LearnerGroupResource.getCollection({ parent: classId }).fetch(),
    updateClassLessons(store, classId),
    setClassState(store, classId),
  ];
  return Promise.all(loadRequirements).then(
    ([learnerGroups]) => {
      store.dispatch('SET_LEARNER_GROUPS', learnerGroups);
      store.dispatch('SET_PAGE_NAME', LessonsPageNames.ROOT);
      store.dispatch('CORE_SET_TITLE', translator.$tr('lessons'));
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    },
    () => {
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    }
  );
}

export function updateClassLessons(store, classId) {
  return LessonResource.getCollection({ collection: classId })
    .fetch({}, true)
    ._promise.then(lessons => {
      store.dispatch('SET_CLASS_LESSONS', lessons);
      // resolve lessons in case it's needed
      return lessons;
    });
}

export function updateCurrentLesson(store, lessonId) {
  const currentLessonId = lessonId || store.state.pageState.lessonId;

  return (
    LessonResource.getModel(currentLessonId)
      .fetch()
      // is lesson set appropriately here?
      .then(lesson => {
        store.dispatch('SET_CURRENT_LESSON', lesson);
        // resolve lesson in case it's needed
        return lesson;
      })
  );
}

export function showLessonSummaryPage(store, classId, lessonId) {
  function updateResourceContentNodes(resourceIds) {
    const contentNodeMap = {};

    if (resourceIds.length) {
      return ContentNodeResource.getCollection({ ids: resourceIds })
        .fetch()
        .then(contentNodeArray => {
          contentNodeArray.forEach(
            // should map directly to resourceIds
            // TODO include route information? Also selection page. Simplify component logic
            // TODO make this a state mapper?
            contentNode =>
              (contentNodeMap[contentNode.pk] = {
                title: contentNode.title,
                // TODO calculate progress
                progress: Number(contentNode.progress_fraction),
                id: contentNode.pk,
                content_id: contentNode.content_id,
                channel_id: contentNode.channel_id,
              })
          );

          store.dispatch('SET_RESOURCE_CONTENT_NODES', contentNodeMap);

          // TODO make sure this is resolved properly
          return contentNodeMap;
        });
    }
    return Promise.resolve(contentNodeMap);
  }
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_STATE', {
    currentLesson: {},
    lessonReport: {},
    resourceContentNodes: [],
    workingResources: [],
  });

  const loadRequirements = [
    updateCurrentLesson(store, lessonId),
    LearnerGroupResource.getCollection({ parent: classId }).fetch(),
    LessonReportResource.getModel(lessonId).fetch({}, true),
    setClassState(store, classId),
  ];

  Promise.all(loadRequirements)
    .then(([currentLesson, learnerGroups, lessonReport]) => {
      // TODO state mapper
      const resourceIds = currentLesson.resources.map(resourceObj => resourceObj.contentnode_id);

      return updateResourceContentNodes(resourceIds).then(() => {
        store.dispatch('SET_WORKING_RESOURCES', resourceIds);
        store.dispatch('SET_LEARNER_GROUPS', learnerGroups);
        store.dispatch('SET_LESSON_REPORT', lessonReport);
        store.dispatch('CORE_SET_PAGE_LOADING', false);
        store.dispatch('SET_PAGE_NAME', LessonsPageNames.SUMMARY);
        store.dispatch('CORE_SET_TITLE', currentLesson.name);
      });
    })
    .catch(() => {
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    });
}

/* eslint-disable no-unused-vars */
function showResourceSelectionPage(
  store,
  classId,
  lessonId,
  contentList,
  pageName,
  ancestors = []
) {
  const pendingSelections = store.state.pageState.workingResources || [];
  const pageState = {
    currentLesson: {},
    contentList: [],
    ancestors: [],
    toolbarRoute: {},
    // contains all selections, including those that haven't been committed to server
    workingResources: pendingSelections,
  };
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_STATE', pageState);

  const loadRequirements = [updateCurrentLesson(store, lessonId), setClassState(store, classId)];
  return Promise.all(loadRequirements).then(
    ([currentLesson]) => {
      // TODO make a state mapper
      // contains selections that were commited to server prior to opening this page
      if (!pendingSelections.length) {
        const preselectedResources = currentLesson.resources.map(
          resourceObj => resourceObj.contentnode_id
        );
        store.dispatch('SET_WORKING_RESOURCES', preselectedResources);
      }

      if (ancestors.length) {
        store.dispatch('SET_ANCESTORS', ancestors);
      }

      // carry pendingSelections over from other interactions in this modal
      store.dispatch('SET_CONTENT_LIST', contentList);
      store.dispatch('SET_PAGE_NAME', pageName);
      store.dispatch('SET_TOOLBAR_ROUTE', { name: LessonsPageNames.SUMMARY });
      store.dispatch('CORE_SET_TITLE', translator.$tr('selectResources'));
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    },
    () => {
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    }
  );
}

export function showLessonResourceSelectionRootPage(store, classId, lessonId) {
  const channelContentList = getChannels(store.state).map(channel => {
    return {
      id: channel.root_id,
      description: channel.description,
      title: channel.title,
      thumbnail: channel.thumbnail,
      kind: ContentNodeKinds.CHANNEL,
    };
  });

  showResourceSelectionPage(
    store,
    classId,
    lessonId,
    channelContentList,
    LessonsPageNames.SELECTION_ROOT
  );
}

export function showLessonResourceSelectionTopicPage(store, classId, lessonId, topicId) {
  function getTopicThumbnail(contentnode) {
    const fileWithThumbnail = contentnode.files.find(file => file.thumbnail && file.available);
    if (fileWithThumbnail) {
      return fileWithThumbnail.storage_url;
    }
    return null;
  }

  const loadRequirements = [
    ContentNodeResource.getModel(topicId).fetch(),
    ContentNodeResource.getCollection({ parent: topicId }).fetch(),
    ContentNodeResource.fetchAncestors(topicId),
  ];

  return Promise.all(loadRequirements).then(
    ([topicNode, childNodes, ancestors]) => {
      const topicAncestors = [...ancestors, topicNode];
      // TODO state mapper
      const topicContentList = childNodes.map(node => {
        return {
          id: node.pk,
          content_id: node.content_id,
          channel_id: node.channel_id,
          description: node.description,
          title: node.title,
          thumbnail: getTopicThumbnail(node),
          kind: node.kind,
        };
      });

      showResourceSelectionPage(
        store,
        classId,
        lessonId,
        topicContentList,
        LessonsPageNames.SELECTION,
        topicAncestors
      );
    },
    () => {
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    }
  );
}

export function saveLessonResources(store, lessonId, resources) {
  // Client-side validation of data shape
  function validateResource(resource) {
    return resource.contentnode_id && resource.channel_id && resource.content_id;
  }
  if (resources.every(validateResource)) {
    // IDEA update current lesson here
    return LessonResource.getModel(lessonId).save({ resources });
  }
  return Promise.reject();
}

export function showLessonSelectionSearchPage(store, classId, lessonId, searchTerm) {
  // TODO reuse selection page, pass search term in to activate search mode in <search-tools>
}

export function showLessonResourceContentPreview(store, classId, lessonId, contentId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  _prepLessonContentPreview(store, classId, lessonId, contentId).then(() => {
    store.dispatch('SET_TOOLBAR_ROUTE', {
      name: LessonsPageNames.RESOURCE_USER_SUMMARY,
    });
    store.dispatch('CORE_SET_PAGE_LOADING', false);
  });
}
export function showLessonSelectionContentPreview(store, classId, lessonId, contentId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  const pendingSelections = store.state.pageState.workingResources || [];
  Promise.all([
    _prepLessonContentPreview(store, classId, lessonId, contentId),
    updateCurrentLesson(store, lessonId),
  ]).then(([contentNode, lesson]) => {
    // TODO state mapper
    const preselectedResources = lesson.resources.map(resourceObj => resourceObj.contentnode_id);
    store.dispatch('SET_TOOLBAR_ROUTE', {
      name: LessonsPageNames.SELECTION,
      params: {
        topicId: contentNode.parent,
      },
    });
    store.dispatch(
      'SET_WORKING_RESOURCES',
      pendingSelections.length ? pendingSelections : preselectedResources
    );
    store.dispatch('CORE_SET_PAGE_LOADING', false);
  });
}

function _prepLessonContentPreview(store, classId, lessonId, contentId) {
  const pageState = {
    currentContentNode: {},
    toolbarRoute: {},
    // only exist if exercises
    workingResources: null,
    questions: null,
    completionData: null,
  };
  return ContentNodeResource.getModel(contentId)
    .fetch()
    .then(contentNode => {
      // set up intial pageState
      const contentMetadata = assessmentMetaDataState(contentNode);
      pageState.currentContentNode = contentNode;
      pageState.questions = contentMetadata.assessmentIds;
      pageState.completionData = contentMetadata.masteryModel;

      store.dispatch('SET_PAGE_STATE', pageState);

      store.dispatch('CORE_SET_TITLE', contentNode.title);
      store.dispatch('SET_PAGE_NAME', LessonsPageNames.CONTENT_PREVIEW);
    });
}
