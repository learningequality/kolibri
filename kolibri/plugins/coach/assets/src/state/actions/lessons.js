import { getChannels } from 'kolibri.coreVue.vuex.getters';
import { assessmentMetaDataState } from 'kolibri.coreVue.vuex.mappers';
import { LearnerGroupResource, LessonResource, ContentNodeResource } from 'kolibri.resources';
import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
import { createTranslator } from 'kolibri.utils.i18n';
import { getContentNodeThumbnail } from 'kolibri.utils.contentNode';
import { handleApiError, createSnackbar } from 'kolibri.coreVue.vuex.actions';
import { error as logError } from 'kolibri.lib.logging';
import router from 'kolibri.coreVue.router';
import LessonReportResource from '../../apiResources/lessonReport';
import { LessonsPageNames } from '../../constants/lessonsConstants';
import { lessonSummaryLink } from '../../views/lessons/lessonsRouterUtils';
import { setClassState } from './main';

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
    refreshClassLessons(store, classId),
    setClassState(store, classId),
  ];
  return Promise.all(loadRequirements).then(
    ([learnerGroups]) => {
      store.dispatch('SET_LEARNER_GROUPS', learnerGroups);
      store.dispatch('SET_PAGE_NAME', LessonsPageNames.ROOT);
      store.dispatch('CORE_SET_TITLE', translator.$tr('lessons'));
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    },
    error => {
      handleApiError(store, error);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    }
  );
}

export function refreshClassLessons(store, classId) {
  return LessonResource.getCollection({ collection: classId })
    .fetch({}, true)
    ._promise.then(lessons => {
      store.dispatch('SET_CLASS_LESSONS', lessons);
      // resolve lessons in case it's needed
      return lessons;
    })
    .catch(error => {
      return handleApiError(store, error);
    });
}

export function updateCurrentLesson(store, lessonId) {
  const currentLessonId = lessonId || store.state.pageState.lessonId;

  return (
    LessonResource.getModel(currentLessonId)
      .fetch()
      // is lesson set appropriately here?
      .then(
        lesson => {
          store.dispatch('SET_CURRENT_LESSON', lesson);
          // resolve lesson in case it's needed
          return lesson;
        },
        error => {
          return handleApiError(store, error);
        }
      )
  );
}

export function showLessonSummaryPage(store, classId, lessonId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_STATE', {
    currentLesson: {},
    lessonReport: {},
    workingResources: [],
    resourceCache: store.state.pageState.resourceCache || {},
    lessonsModalSet: null,
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

      return getResourceCache(store, resourceIds).then(resourceCache => {
        const availableResourceIds = resourceIds.filter(id => resourceCache[id]);
        store.dispatch('SET_WORKING_RESOURCES', availableResourceIds);
        store.dispatch('SET_LEARNER_GROUPS', learnerGroups);
        store.dispatch('SET_LESSON_REPORT', lessonReport);
        store.dispatch('CORE_SET_PAGE_LOADING', false);
        store.dispatch('SET_PAGE_NAME', LessonsPageNames.SUMMARY);
        store.dispatch('CORE_SET_TITLE', currentLesson.title);
      });
    })
    .catch(error => {
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      return handleApiError(store, error);
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
  const cache = store.state.pageState.resourceCache || {};
  const pageState = {
    currentLesson: {},
    contentList: [],
    ancestors: [],
    toolbarRoute: {},
    // contains all selections, including those that haven't been committed to server
    workingResources: pendingSelections,
    resourceCache: cache,
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

      const ancestorCounts = {};

      const getResourceAncestors = store.state.pageState.workingResources.map(resourceId =>
        ContentNodeResource.fetchAncestors(resourceId)
      );

      return Promise.all(
        getResourceAncestors.map(getResourceAncestor =>
          getResourceAncestor.then(ancestorArray => {
            ancestorArray.forEach(ancestor => {
              if (ancestorCounts[ancestor.pk]) {
                ancestorCounts[ancestor.pk]++;
              } else {
                ancestorCounts[ancestor.pk] = 1;
              }
            });
          })
        )
      ).finally(
        // there has to be a better way
        () => {
          store.dispatch('SET_ANCESTOR_COUNTS', ancestorCounts);
          // carry pendingSelections over from other interactions in this modal
          store.dispatch('SET_CONTENT_LIST', contentList);
          store.dispatch('SET_PAGE_NAME', pageName);
          store.dispatch('SET_TOOLBAR_ROUTE', { name: LessonsPageNames.SUMMARY });
          store.dispatch('CORE_SET_TITLE', translator.$tr('selectResources'));
          store.dispatch('CORE_SET_PAGE_LOADING', false);
        }
      );
    },
    error => {
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      return handleApiError(store, error);
    }
  );
}

export function showLessonResourceSelectionRootPage(store, classId, lessonId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  const channelContentList = getChannels(store.state).map(channel => {
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

export function showLessonResourceSelectionTopicPage(store, classId, lessonId, topicId) {
  // IDEA should probably have both selection pages set loading themselves
  store.dispatch('CORE_SET_PAGE_LOADING', true);
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
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      return handleApiError(store, error);
    }
  );
}

function getResourceCache(store, resourceIds) {
  // duplicate data to remove reliance on pageState throughout the entire method
  const { resourceCache } = Object.assign({}, store.state.pageState);
  const nonCachedResourceIds = [];

  if (resourceCache) {
    resourceIds.forEach(id => {
      if (!resourceCache[id]) {
        nonCachedResourceIds.push(id);
      }
    });
  }

  if (nonCachedResourceIds.length) {
    return ContentNodeResource.getCollection({
      ids: nonCachedResourceIds,
    })
      .fetch()
      ._promise.then(contentNodes => {
        contentNodes.forEach(contentNode => store.dispatch('ADD_TO_RESOURCE_CACHE', contentNode));
        return resourceCache;
      });
  } else {
    return Promise.resolve(resourceCache);
  }
}

export function saveLessonResources(store, lessonId, resourceIds) {
  return getResourceCache(store, resourceIds).then(resourceCache => {
    const resources = resourceIds
      .map(resourceId => {
        const node = resourceCache[resourceId];
        if (node) {
          return {
            contentnode_id: resourceId,
            channel_id: node.channel_id,
            content_id: node.content_id,
          };
        }
      })
      .filter(resource => resource);

    return LessonResource.getModel(lessonId).save({ resources });
  });
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
  return Promise.all([
    _prepLessonContentPreview(store, classId, lessonId, contentId),
    updateCurrentLesson(store, lessonId),
  ])
    .then(([contentNode, lesson]) => {
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
    })
    .catch(error => {
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      return handleApiError(store, error);
    });
}

function _prepLessonContentPreview(store, classId, lessonId, contentId) {
  const cache = store.state.pageState.resourceCache || {};
  const pageState = {
    currentContentNode: {},
    toolbarRoute: {},
    // only exist if exercises
    workingResources: null,
    resourceCache: cache,
    questions: null,
    completionData: null,
  };
  return ContentNodeResource.getModel(contentId)
    .fetch()
    .then(
      contentNode => {
        // set up intial pageState
        const contentMetadata = assessmentMetaDataState(contentNode);
        pageState.currentContentNode = contentNode;
        pageState.questions = contentMetadata.assessmentIds;
        pageState.completionData = contentMetadata.masteryModel;
        store.dispatch('SET_PAGE_STATE', pageState);
        store.dispatch('CORE_SET_TITLE', contentNode.title);
        store.dispatch('SET_PAGE_NAME', LessonsPageNames.CONTENT_PREVIEW);
        return contentNode;
      },
      error => {
        return handleApiError(store, error);
      }
    );
}

export function setLessonsModal(store, modalName) {
  store.dispatch('SET_LESSONS_MODAL', modalName);
}

export function updateLessonStatus(store, lessonId, isActive) {
  LessonResource.getModel(lessonId)
    .save({
      is_active: isActive,
    })
    ._promise.then(lesson => {
      store.dispatch('SET_CURRENT_LESSON', lesson);
      setLessonsModal(store, null);

      const trs = createTranslator('updateLessonStatus', {
        lessonIsNowActive: 'Lesson is now active',
        lessonIsNowInactive: 'Lesson is now inactive',
      });

      createSnackbar(store, {
        text: isActive ? trs.$tr('lessonIsNowActive') : trs.$tr('lessonIsNowInactive'),
        autoDismiss: true,
      });
    })
    .catch(err => {
      // TODO handle error properly
      handleApiError(store, err);
      logError(err);
    });
}

export function deleteLesson(store, lessonId, classId) {
  LessonResource.getModel(lessonId)
    .delete()
    ._promise.then(() => refreshClassLessons(store, classId))
    .then(() => {
      router.replace({
        name: LessonsPageNames.ROOT,
        params: {
          classId,
          lessonId,
        },
      });
      createSnackbar(store, {
        text: createTranslator('lessonDeletedSnackbar', {
          lessonDeleted: 'Lesson deleted',
        }).$tr('lessonDeleted'),
        autoDismiss: true,
      });
    })
    .catch(error => {
      // TODO handle error inside the current page
      handleApiError(store, error);
      logError(error);
    });
}

export function copyLesson(store, payload, classroomName) {
  LessonResource.createModel(payload)
    .save()
    ._promise.then(() => {
      setLessonsModal(store, null);
      createSnackbar(store, {
        text: createTranslator('lessonCopiedSnackbar', {
          copiedLessonTo: `Copied lesson to '{classroomName}'`,
        }).$tr('copiedLessonTo', { classroomName }),
        autoDismiss: true,
      });
    })
    .catch(error => {
      handleApiError(store, error);
      logError(error);
    });
}

export function updateLesson(store, lessonId, payload) {
  return new Promise((resolve, reject) => {
    LessonResource.getModel(lessonId)
      .save(payload)
      .then(updatedLesson => {
        setLessonsModal(store, null);
        createSnackbar(store, {
          text: createTranslator('lessonUpdatedSnackbar', {
            changesToLessonSaved: 'Changes to lesson saved',
          }).$tr('changesToLessonSaved'),
          autoDismiss: true,
        });
        updateCurrentLesson(store, lessonId);
        resolve();
      })
      .catch(error => {
        reject();
      });
  });
}

export function createLesson(store, classId, payload) {
  return new Promise((resolve, reject) => {
    return LessonResource.createModel({
      ...payload,
      lesson_resources: [],
      collection: classId,
    })
      .save()
      .then(newLesson => {
        setLessonsModal(store, null);
        router.push(lessonSummaryLink({ classId: classId, lessonId: newLesson.id }));
        createSnackbar(store, {
          text: createTranslator('lessonCreatedSnackbar', {
            newLessonCreated: 'New lesson created',
          }).$tr('newLessonCreated'),
          autoDismiss: true,
        });
        resolve();
      })
      .catch(() => {
        reject();
      });
  });
}
