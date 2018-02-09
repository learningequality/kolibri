import { LessonsPageNames } from '../../lessonsConstants';
import { getChannels } from 'kolibri.coreVue.vuex.getters';
import { setClassState } from './main';
import { LearnerGroupResource, LessonResource, ContentNodeResource } from 'kolibri.resources';
import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
import { createTranslator } from 'kolibri.utils.i18n';
import every from 'lodash/every';

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
    updateLessons(store, classId),
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

export function updateLessons(store, classId) {
  return LessonResource.getCollection({ collection: classId })
    .fetch({}, true)
    ._promise.then(lessons => {
      store.dispatch('SET_CLASS_LESSONS', lessons);
    });
}

export function showLessonSummaryPage(store, classId, lessonId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_STATE', {
    currentLesson: {},
    resourceContentNodes: [],
  });

  const loadRequirements = [
    LessonResource.getModel(lessonId).fetch(),
    LearnerGroupResource.getCollection({ parent: classId }).fetch(),
    setClassState(store, classId),
  ];

  Promise.all(loadRequirements).then(([lesson, learnerGroups]) => {
    const resourcePromises = lesson.resources.map(resource =>
      ContentNodeResource.getModel(resource.contentnode_id).fetch()
    );

    Promise.all(resourcePromises).then(resourceContentNodes => {
      store.dispatch('SET_RESOURCE_CONTENT_NODES', resourceContentNodes);
      store.dispatch('SET_LEARNER_GROUPS', learnerGroups);
      store.dispatch('SET_CURRENT_LESSON', lesson);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('SET_PAGE_NAME', LessonsPageNames.SUMMARY);
      store.dispatch('CORE_SET_TITLE', lesson.name);
    });
  });
}

/* eslint-disable no-unused-vars */
export function showLessonResourceSummaryPage(store, classId, lessonId, contentId) {}

export function showLessonResourceUserSummaryPage(store, classId, lessonId, contentId, userId) {}

export function showLessonReviewPage(store, classId, lessonId) {}

function showSelectionPage(store, classId, lessonId, contentList, pageName, ancestors = []) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  const loadRequirements = [updateLessons(store, classId), setClassState(store, classId)];
  return Promise.all(loadRequirements).then(
    () => {
      const currentLesson = store.state.pageState.lessons.find(lesson => lesson.id === lessonId);
      // contains all selections, including those that haven't been committed to server
      const pendingSelections = store.state.pageState.selectedResources || [];
      // contains selections that were commited to server prior to opening this page
      const preselectedResources = currentLesson.resources.map(
        resourceObj => resourceObj.contentnode_id
      );
      const currentResources = () =>
        pendingSelections.length ? pendingSelections : preselectedResources;

      const pageState = {
        currentLesson: {},
        contentList: [],
        // carry pendingSelections over from other interactions in this modal
        selectedResources: currentResources(),
      };

      store.dispatch('SET_PAGE_STATE', pageState);

      if (ancestors.length) {
        store.dispatch('SET_ANCESTORS', ancestors);
      }
      store.dispatch('SET_CONTENT_LIST', contentList);
      store.dispatch('SET_CURRENT_LESSON', currentLesson);
      store.dispatch('SET_PAGE_NAME', pageName);
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

  showSelectionPage(store, classId, lessonId, channelContentList, LessonsPageNames.SELECTION_ROOT);
}

function getThumbnailUrl(contentnode) {
  const fileWithThumbnail = contentnode.files.find(file => file.thumbnail && file.available);
  if (fileWithThumbnail) {
    return fileWithThumbnail.storage_url;
  }
  return null;
}

export function showLessonSelectionTopicPage(store, classId, lessonId, topicId) {
  const loadRequirements = [
    ContentNodeResource.getModel(topicId).fetch(),
    ContentNodeResource.getCollection({ parent: topicId }).fetch(),
    ContentNodeResource.fetchAncestors(topicId),
  ];
  return Promise.all(loadRequirements).then(
    ([topicNode, childNodes, ancestors]) => {
      const topicAncestors = [...ancestors, topicNode];
      const topicContentList = childNodes.map(node => {
        return {
          id: node.pk,
          description: node.description,
          title: node.title,
          thumbnail: getThumbnailUrl(node),
          kind: node.kind,
        };
      });

      showSelectionPage(
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
  if (every(resources, resource => resource.contentnode_id)) {
    return LessonResource.getModel(lessonId).save({ resources });
  }
  return Promise.reject();
}

export function showLessonSelectionSearchPage(store, classId, lessonId, searchTerm) {}

export function showLessonContentPreview(store, classId, lessonId, contentId) {}
