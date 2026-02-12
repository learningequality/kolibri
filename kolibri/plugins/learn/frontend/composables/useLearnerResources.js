/**
 * A composable function containing logic related to learner's
 * resources - both class resources/quizzes, non-class resources,
 * and related.
 * All data exposed by this function belong to a current learner.
 */

import { computed, ref } from 'vue';
import { get, set } from '@vueuse/core';
import flatMap from 'lodash/flatMap';
import flatMapDepth from 'lodash/flatMapDepth';

import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import { deduplicateResources } from 'kolibri-common/utils/contentNode';
import {
  LearnerClassroomResource,
  LearnerLessonResource,
  LearnerCourseResource,
} from '../apiResources';
import { ClassesPageNames } from '../constants';
import useContentNodeProgress, { setContentNodeProgress } from './useContentNodeProgress';

// The refs are defined in the outer scope so they can be used as a shared store
const _resumableContentNodes = ref([]);
const moreResumableContentNodes = ref(null);
const classes = ref([]);
const { fetchContentNodeProgress } = useContentNodeProgress();
const courses = ref([]);
const courseContent = ref({});
const courseProgress = ref({});

export function setResumableContentNodes(nodes, more = null) {
  set(_resumableContentNodes, nodes);
  set(moreResumableContentNodes, more);
  ContentNodeResource.cacheData(nodes);
}

function addResumableContentNodes(nodes, more = null) {
  set(_resumableContentNodes, [...get(_resumableContentNodes), ...nodes]);
  set(moreResumableContentNodes, more);
  ContentNodeResource.cacheData(nodes);
}

function _cacheLessonResources(lesson) {
  for (const resource of lesson.resources) {
    if (resource.contentnode && resource.contentnode.content_id) {
      ContentNodeResource.cacheData(resource.contentnode);
      setContentNodeProgress({
        content_id: resource.contentnode.content_id,
        progress: resource.progress,
      });
    }
  }
}

function setClassData(classroom) {
  for (const lesson of classroom.lessons) {
    _cacheLessonResources(lesson);
  }
}

export function setClasses(classData) {
  set(classes, classData);
  for (const classroom of classData) {
    setClassData(classroom);
  }
}

function setCourseData(courseId, content, progress) {
  set(courseContent, { ...get(courseContent), [courseId]: content });
  set(courseProgress, { ...get(courseProgress), [courseId]: progress });
  ContentNodeResource.cacheData(content);
}

export default function useLearnerResources() {
  /**
   * @returns {Array} - All quizzes assigned to a learner in all their classes
   * @private
   */
  const _classesQuizzes = computed(() => {
    return flatMap(get(classes), c => c.exams);
  });

  /**
   * Because the API endpoint only returns active lessons this is just all the lessons
   * @returns {Array} - All active lessons assigned to a learner in all their classes
   * @public
   */
  const activeClassesLessons = computed(() => {
    return flatMap(get(classes), c => c.lessons);
  });

  /**
   * @returns {Array} - An array of { contentNodeId, lessonId, classId, active } objects
   *                    of all resources from all learner's classes
   * @private
   */
  const _classesResources = computed(() => {
    return flatMapDepth(
      get(classes),
      c =>
        c.lessons.map(l =>
          l.resources.map(r => ({
            contentNodeId: r.contentnode_id,
            progress: r.progress,
            lessonId: l.id,
            classId: c.id,
            contentNode: r.contentnode,
          })),
        ),
      2,
    );
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
   * @returns {Array} - An array of { contentNodeId, lessonId, classId, contentNode } objects
   *                    of all resources in progress from all learner's active lessons
   * @public
   */
  const resumableClassesResources = computed(() => {
    return get(_classesResources).filter(resource => {
      return resource.progress && resource.progress < 1 && resource.contentNode;
    });
  });

  /**
   * @returns {Boolean} - `true` if a learner finished all active
   *                       classes lessons and quizzes (or when there are none)
   * @public
   */
  const learnerFinishedAllClasses = computed(() => {
    const hasUnfinishedLesson = get(activeClassesLessons).some(lesson => {
      return lesson.progress.resource_progress < lesson.progress.total_resources;
    });
    const hasUnfinishedQuiz = get(activeClassesQuizzes).some(quiz => {
      return !quiz.progress.closed;
    });
    return !(hasUnfinishedLesson || hasUnfinishedQuiz);
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
   * @param {String} classId
   * @returns {Array} All active lessons of a class
   * @public
   */
  function getClassActiveLessons(classId) {
    const classroom = getClass(classId);
    if (!classroom || !classroom.lessons) {
      return [];
    }
    return classroom.lessons.filter(lesson => lesson.active);
  }

  /**
   * @param {String} classId
   * @returns {Array} All active quizzes of a class
   * @public
   */
  function getClassActiveQuizzes(classId) {
    const classroom = getClass(classId);
    if (!classroom || !classroom.exams) {
      return [];
    }
    return classroom.exams.filter(exam => exam.active);
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
          tryIndex: 0,
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
   * Fetches a class by its ID and saves data
   * to this composable's store
   *
   * @param {String} classId
   * @param {Boolean} force Cache won't be used when `true`
   * @returns  {Promise}
   * @public
   */
  function fetchClass({ classId, force = false }) {
    return LearnerClassroomResource.fetchModel({ id: classId, force }).then(classroom => {
      const updatedClasses = [...get(classes).filter(c => c.id !== classId), classroom];
      set(classes, updatedClasses);
      setClassData(classroom);
      return classroom;
    });
  }

  /**
   * Fetches current learner's classes
   * and saves data to this composable's store
   *
   * @param {Boolean} force Cache won't be used when `true`
   * @returns {Promise}
   * @public
   */
  function fetchClasses({ force = false } = {}) {
    return LearnerClassroomResource.fetchCollection({ force }).then(collection => {
      set(classes, collection);
    });
  }

  function fetchLesson({ lessonId } = {}) {
    return LearnerLessonResource.fetchModel({ id: lessonId }).then(lesson => {
      _cacheLessonResources(lesson);
      return lesson;
    });
  }

  /**
   * Fetches resumable content nodes with their progress data
   * and saves data to this composable's store
   *
   * @returns {Promise}
   * @public
   */
  function fetchResumableContentNodes() {
    const params = { resume: true, max_results: 12, ordering: '-last_interacted' };
    fetchContentNodeProgress(params);
    return ContentNodeResource.fetchResume(params).then(({ results, more }) => {
      if (!results || !results.length) {
        return [];
      }
      setResumableContentNodes(results, more);
      return results;
    });
  }

  /**
   * Fetches more resumable content nodes with their progress data
   * and saves data to this composable's store
   *
   * @returns {Promise}
   * @public
   */
  function fetchMoreResumableContentNodes() {
    const params = get(moreResumableContentNodes);
    if (!params) {
      return Promise.resolve();
    }
    fetchContentNodeProgress(params);
    return ContentNodeResource.fetchResume(params).then(({ results, more }) => {
      if (!results || !results.length) {
        return [];
      }
      addResumableContentNodes(results, more);
      return results;
    });
  }

  const resumableContentNodes = computed(() => {
    return deduplicateResources(get(_resumableContentNodes));
  });

  /**
   * @param {String} courseId
   * @returns {Object} Course content tree
   * @public
   */
  function getCourseContent(courseId) {
    return get(courseContent)[courseId];
  }

  /**
   * @param {String} courseId
   * @returns {Object} Course progress data
   * @public
   */
  function getCourseProgress(courseId) {
    return get(courseProgress)[courseId];
  }

  /**
   * @param {String} courseId
   * @returns {Array} Course units
   * @public
   */
  function getCourseUnits(courseId) {
    return get(courseContent)[courseId]?.children?.results ?? [];
  }

  /**
   * Fetches a course by its session ID and saves data
   * to this composable's store
   *
   * @param {String} courseSessionId
   * @param {Boolean} force Cache won't be used when `true`
   * @returns {Promise<Object>} Course data
   * @public
   */
  async function fetchCourse({ courseSessionId, force = false }) {
    const course = await LearnerCourseResource.fetchModel({ id: courseSessionId, force });

    if (!course) {
      throw new Error('Course not found');
    }

    // Update courses list
    const updatedCourses = [...get(courses).filter(c => c.id !== course.id), course];
    set(courses, updatedCourses);

    // Fetch course content tree and learner course progress
    const [content, progressResponse] = await Promise.all([
      course.course_id ? ContentNodeResource.fetchTree({ id: course.course_id }) : null,
      LearnerCourseResource.getResumeData(course.id),
    ]);

    const progress = progressResponse?.data || null;

    // Cache the data
    setCourseData(course.course_id, content, progress);

    return { course, content, progress };
  }

  /**
   * Fetches current learner's courses
   * and saves data to this composable's store
   *
   * @param {Boolean} force Cache won't be used when `true`
   * @returns {Promise<Array>}
   * @public
   */
  async function fetchCourses({ force = false } = {}) {
    const collection = await LearnerCourseResource.fetchCollection({ force });
    set(courses, collection);
    return collection;
  }

  /**
   * @param {String} testType - 'pre' or 'post'
   * @returns {Boolean} Whether the test is currently available
   * @public
   */
  function isUnitTestAvailable(courseId, unitId, testType) {
    const progress = getCourseProgress(courseId);
    const activeTest = progress?.active_test;

    if (!activeTest) {
      return false;
    }

    return activeTest.unit_id === unitId && activeTest.test_type === testType;
  }

  /**
   * @param {String} courseId
   * @param {String} unitId
   * @param {String} lessonId
   * @returns {Boolean} Whether the lesson resource is available
   * @public
   */
  function isCourseResourceAvailable(courseId, unitId, lessonId) {
    const progress = getCourseProgress(courseId);
    const units = getCourseUnits(courseId);

    if (!progress?.started || !progress.resume_position?.unit_id) {
      return false;
    }

    const resumeUnitId = progress.resume_position.unit_id;
    const resumeLessonId = progress.resume_position.lesson_id;

    // Find the current unit to get its sort_order
    const currentUnit = units.find(unit => unit.id === resumeUnitId);

    if (!currentUnit) {
      return false;
    }

    const targetUnit = units.find(unit => unit.id === unitId);

    if (!targetUnit || !targetUnit.children?.results) {
      return false;
    }

    // If this unit comes before the current unit, all lessons are available
    if (targetUnit.sort_order < currentUnit.sort_order) {
      return true;
    }

    // If this is the current unit
    if (unitId === resumeUnitId) {
      // If no resume lesson specified, no lessons available yet
      if (!resumeLessonId) {
        return false;
      }

      const lessons = targetUnit.children.results;
      const resumeLesson = lessons.find(lesson => lesson.id === resumeLessonId);
      const targetLesson = lessons.find(lesson => lesson.id === lessonId);

      if (!resumeLesson || !targetLesson) {
        return false;
      }

      // Check if target lesson's sort_order <= resume lesson's sort_order
      return targetLesson.sort_order <= resumeLesson.sort_order;
    }

    return false;
  }

  /**
   * @param {String} courseId
   * @param {String} unitId
   * @param {String} lessonId
   * @returns {Boolean} Whether this is the current resource being worked on
   * @public
   */
  function isCurrentCourseResource(courseId, unitId, lessonId) {
    const progress = getCourseProgress(courseId);
    const resumePosition = progress?.resume_position;

    if (!resumePosition) {
      return false;
    }

    return resumePosition.unit_id === unitId && resumePosition.lesson_id === lessonId;
  }

  return {
    classes,
    activeClassesLessons,
    activeClassesQuizzes,
    resumableClassesQuizzes,
    resumableClassesResources,
    learnerFinishedAllClasses,
    getClass,
    getClassActiveLessons,
    getClassActiveQuizzes,
    getClassLessonLink,
    getClassQuizLink,
    fetchClass,
    fetchClasses,
    fetchLesson,
    fetchResumableContentNodes,
    fetchMoreResumableContentNodes,
    resumableContentNodes,
    moreResumableContentNodes,
    courses,
    getCourseContent,
    getCourseProgress,
    getCourseUnits,
    fetchCourse,
    fetchCourses,
    isUnitTestAvailable,
    isCourseResourceAvailable,
    isCurrentCourseResource,
  };
}
