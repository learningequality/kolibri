/**
 * A composable function containing logic related to learner's
 * resources - both class resources/quizzes, non-class resources,
 * and related.
 * All data exposed by this function belong to a current learner.
 */

import { computed, ref } from 'kolibri.lib.vueCompositionApi';
import { get, set } from '@vueuse/core';
import flatMap from 'lodash/flatMap';

import { ContentNodeResource } from 'kolibri.resources';
import { LearnerClassroomResource } from '../apiResources';
import { PageNames, ClassesPageNames } from '../constants';

// The refs are defined in the outer scope so they can be use as a store
const _resumableContentNodes = ref([]);
const classes = ref([]);

export default function useLearnerResources() {
  /**
   * @returns {Array} - All quizzes assigned to a learner in all their classes
   * @private
   */
  const _classesQuizzes = computed(() => {
    return flatMap(get(classes), c => c.assignments.exams);
  });

  /**
   * @returns {Array} - All lessons assigned to a learner in all their classes
   * @private
   */
  const _classesLessons = computed(() => {
    return flatMap(get(classes), c => c.assignments.lessons);
  });

  /**
   * @returns {Array} - An array of { contentNodeId, lessonId, classId, active } objects
   *                    of all resources from all learner's classes
   * @private
   */
  const _classesResources = computed(() => {
    const resources = [];
    get(classes).forEach(c => {
      const lessons = c.assignments.lessons;
      lessons.forEach(lesson => {
        lesson.resources.forEach(resource => {
          resources.push({
            contentNodeId: resource.contentnode_id,
            lessonId: lesson.id,
            classId: c.id,
            active: lesson.is_active,
          });
        });
      });
    });
    return resources;
  });

  /**
   * @returns {Array} - An array of { contentNodeId, lessonId, classId } objects
   *                    of all resources from all learner's active lessons
   * @private
   */
  const _activeClassesResources = computed(() => {
    return get(_classesResources)
      .filter(resource => resource.active)
      .map(resource => {
        return {
          contentNodeId: resource.contentNodeId,
          lessonId: resource.lessonId,
          classId: resource.classId,
        };
      });
  });

  /**
   * @returns  {Boolean}
   * @private
   */
  function _isContentNodeResumable(contentNodeId) {
    const resumableContentNodesIds = get(_resumableContentNodes).map(contentNode => contentNode.id);
    return get(resumableContentNodesIds).includes(contentNodeId);
  }

  /**
   * @returns  {Boolean}
   * @private
   */
  function _isContentNodeInClasses(contentNodeId) {
    return get(_classesResources).some(resource => resource.contentNodeId === contentNodeId);
  }

  /**
   * @param {Object} resource { contentNodeId, lessonId, classId }
   * @returns {Number} Index of a resource in a class lesson
   * @private
   */
  function _getLessonResourceIdx(resource) {
    const lesson = get(_classesLessons).find(
      l => l.collection === resource.classId && l.id === resource.lessonId
    );
    if (!lesson) {
      return undefined;
    }
    return lesson.resources.findIndex(r => r.contentnode_id === resource.contentNodeId);
  }

  /**
   * @returns {Array} - All active lessons assigned to a learner in all their classes
   * @public
   */
  const activeClassesLessons = computed(() => {
    return get(_classesLessons).filter(lesson => lesson.is_active);
  });

  /**
   * @returns {Array} - All active quizzes assigned to a learner in all their classes
   * @public
   */
  const activeClassesQuizzes = computed(() => {
    return get(_classesQuizzes).filter(quiz => quiz.active);
  });

  /**
   * @returns {Array} - Active and in progress quizzes assigned to a learner
   *                    in all their classes
   * @public
   */
  const resumableClassesQuizzes = computed(() => {
    return get(activeClassesQuizzes).filter(quiz => quiz.progress.started && !quiz.progress.closed);
  });

  /**
   * @returns {Array} - An array of { contentNodeId, lessonId, classId } objects
   *                    of all resources in progress from all learner's active lessons
   * @public
   */
  const resumableClassesResources = computed(() => {
    return get(_activeClassesResources).filter(resource => {
      return _isContentNodeResumable(resource.contentNodeId);
    });
  });

  /**
   * @returns {Array} - Content nodes in progress that don't belong
   *                    to any of learner's classes
   * @public
   */
  const resumableNonClassesContentNodes = computed(() => {
    return get(_resumableContentNodes).filter(
      contentNode => !_isContentNodeInClasses(contentNode.id)
    );
  });

  /**
   * @param {String} classId
   * @returns {Object} A class
   * @public
   */
  function getClass(classId) {
    return get(classes).find(c => c.id === classId);
  }

  /**
   * @param {String} contentNodeId
   * @returns {Object}
   * @public
   */
  function getResumableContentNode(contentNodeId) {
    return get(_resumableContentNodes).find(contentNode => contentNode.id === contentNodeId);
  }

  /**
   * @param {Object} lesson
   * @returns {Object} vue-router link to a lesson page
   * @public
   */
  function getClassLessonLink(lesson) {
    if (!lesson) {
      return undefined;
    }
    return {
      name: ClassesPageNames.LESSON_PLAYLIST,
      params: {
        classId: lesson.collection,
        lessonId: lesson.id,
      },
    };
  }

  /**
   * @param {Object} quiz
   * @returns {Object} vue-router link to a quiz report page when the quiz
   *                   is closed. Otherwise returns a link to a quiz page.
   * @public
   */
  function getClassQuizLink(quiz) {
    if (!quiz || !quiz.progress) {
      return undefined;
    }
    if (quiz.progress.closed) {
      return {
        name: ClassesPageNames.EXAM_REPORT_VIEWER,
        params: {
          classId: quiz.collection,
          examId: quiz.id,
          questionNumber: 0,
          questionInteraction: 0,
        },
      };
    }
    return {
      name: ClassesPageNames.EXAM_VIEWER,
      params: {
        classId: quiz.collection,
        examId: quiz.id,
        questionNumber: 0,
      },
    };
  }

  /**
   * @param {Object} resource { contentNodeId, lessonId, classId }
   * @returns {Object} vue-router link to a resource page
   * @public
   */
  function getClassResourceLink(resource) {
    const lessonResourceIdx = _getLessonResourceIdx(resource);
    if (!lessonResourceIdx) {
      return undefined;
    }
    return {
      name: ClassesPageNames.LESSON_RESOURCE_VIEWER,
      params: {
        classId: resource.classId,
        lessonId: resource.lessonId,
        resourceNumber: lessonResourceIdx,
      },
    };
  }

  /**
   * @returns {Object} - A vue-router link to a topic content node page
   */
  function getTopicContentNodeLink(contentNodeId) {
    return {
      name: PageNames.TOPICS_CONTENT,
      params: {
        id: contentNodeId,
      },
    };
  }

  /**
   * @returns {Promise}
   * @public
   */
  function fetchClasses() {
    LearnerClassroomResource.fetchCollection().then(collection => {
      set(classes, collection);
    });
  }

  /**
   * @returns {Promise}
   * @public
   */
  function fetchResumableContentNodes() {
    ContentNodeResource.fetchResume().then(collection => {
      set(_resumableContentNodes, collection);
    });
  }

  return {
    classes,
    activeClassesLessons,
    activeClassesQuizzes,
    resumableClassesQuizzes,
    resumableClassesResources,
    resumableNonClassesContentNodes,
    getClass,
    getResumableContentNode,
    getClassLessonLink,
    getClassQuizLink,
    getClassResourceLink,
    getTopicContentNodeLink,
    fetchClasses,
    fetchResumableContentNodes,
  };
}
