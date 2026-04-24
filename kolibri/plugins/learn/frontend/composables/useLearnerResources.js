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
import { ClassesPageNames, PageNames } from '../constants';
import useContentNodeProgress, { setContentNodeProgress } from './useContentNodeProgress';

// The refs are defined in the outer scope so they can be used as a shared store
const _resumableContentNodes = ref([]);
const moreResumableContentNodes = ref(null);
const classes = ref([]);
const { fetchContentNodeProgress, contentNodeProgressMap } = useContentNodeProgress();
const courses = ref([]);
const courseContent = ref({});
const courseProgress = ref({});

export function setResumableContentNodes(nodes, more = null) {
  set(_resumableContentNodes, nodes);
  set(moreResumableContentNodes, more);
}

function addResumableContentNodes(nodes, more = null) {
  set(_resumableContentNodes, [...get(_resumableContentNodes), ...nodes]);
  set(moreResumableContentNodes, more);
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
}

export default function useLearnerResources() {
  const _classesQuizzes = computed(() => {
    return flatMap(get(classes), c => c.exams);
  });

  const activeClassesLessons = computed(() => {
    return flatMap(get(classes), c => c.lessons);
  });

  const activeClassesCourses = computed(() => {
    return flatMap(get(classes), c => c.courses || []);
  });

  /**
   * @returns {Array} - An array of { contentNodeId, lessonId, classId, active } objects
   *                    of all resources from all learner's classes.
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
   * @returns {Array} - All active quizzes assigned to a learner in all their classes.
   * @public
   */
  const activeClassesQuizzes = computed(() => {
    return get(_classesQuizzes).filter(quiz => quiz.active);
  });

  /**
   * @returns {Array} - Active and in progress quizzes assigned to a learner
   *                    in all their classes.
   * @public
   */
  const resumableClassesQuizzes = computed(() => {
    return get(activeClassesQuizzes).filter(quiz => quiz.progress.started && !quiz.progress.closed);
  });

  /**
   * @returns {Array} - An array of { contentNodeId, lessonId, classId, contentNode } objects
   *                    of all resources in progress from all learner's active lessons.
   * @public
   */
  const resumableClassesResources = computed(() => {
    return get(_classesResources).filter(resource => {
      if (!resource.contentNode) return false;
      const contentId = resource.contentNode.content_id;
      const progress = Math.max(
        resource.progress || 0,
        (contentId && contentNodeProgressMap[contentId]) || 0,
      );
      return progress > 0 && progress < 1;
    });
  });

  /**
   * @returns {boolean} - `true` if a learner finished all active
   *                       classes lessons and quizzes (or when there are none).
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

  function getClass(classId) {
    return get(classes).find(c => c.id === classId);
  }

  function getClassActiveLessons(classId) {
    const classroom = getClass(classId);
    if (!classroom || !classroom.lessons) {
      return [];
    }
    return classroom.lessons.filter(lesson => lesson.active);
  }

  function getClassActiveQuizzes(classId) {
    const classroom = getClass(classId);
    if (!classroom || !classroom.exams) {
      return [];
    }
    return classroom.exams.filter(exam => exam.active);
  }

  function getClassActiveCourses(classId) {
    const classroom = getClass(classId);
    if (!classroom || !classroom.courses) {
      return [];
    }
    return classroom.courses;
  }

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

  function getClassCourseLink(course) {
    if (!course) {
      return undefined;
    }
    return {
      name: PageNames.COURSE_CONTENT__COURSE,
      params: {
        courseId: course.id,
      },
    };
  }

  function fetchClass({ classId, force = false }) {
    return LearnerClassroomResource.fetchModel({ id: classId, force }).then(classroom => {
      const updatedClasses = [...get(classes).filter(c => c.id !== classId), classroom];
      set(classes, updatedClasses);
      setClassData(classroom);
      return classroom;
    });
  }

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

  function fetchResumableContentNodes() {
    const params = {
      resume: true,
      max_results: 12,
      ordering: '-last_interacted',
      exclude_course_ancestry: true,
    };
    fetchContentNodeProgress(params);
    return ContentNodeResource.fetchResume(params).then(({ results, more }) => {
      if (!results || !results.length) {
        return [];
      }
      setResumableContentNodes(results, more);
      return results;
    });
  }

  function fetchMoreResumableContentNodes() {
    const params = get(moreResumableContentNodes);
    if (!params) {
      return Promise.resolve();
    }
    fetchContentNodeProgress(params);
    return ContentNodeResource.fetchResume(params).then(({ results, more }) => {
      if (!results || !results.length) {
        // Clear the more params so the "View more" button is hidden
        set(moreResumableContentNodes, null);
        return [];
      }
      addResumableContentNodes(results, more);
      return results;
    });
  }

  const resumableContentNodes = computed(() => {
    return deduplicateResources(get(_resumableContentNodes));
  });

  function getCourseContent(courseId) {
    return get(courseContent)[courseId];
  }

  function getCourseProgress(courseId) {
    return get(courseProgress)[courseId];
  }

  function getCourseUnits(courseId) {
    return get(courseContent)[courseId]?.children?.results ?? [];
  }

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

    const progress = progressResponse || null;

    // Cache the data
    setCourseData(course.course_id, content, progress);

    return { course, content, progress };
  }

  async function fetchCourses({ force = false } = {}) {
    const collection = await LearnerCourseResource.fetchCollection({ force });
    set(courses, collection);
    return collection;
  }

  function isUnitTestAvailable(courseId, unitId, testType) {
    const progress = getCourseProgress(courseId);
    const activeTest = progress?.active_test;

    if (!activeTest) {
      return false;
    }

    return activeTest.unit_id === unitId && activeTest.test_type === testType;
  }

  function isCourseLessonAvailable(courseId, unitId, lessonId) {
    const progress = getCourseProgress(courseId);
    const units = getCourseUnits(courseId);

    if (!progress?.started || !progress.resume_position?.unit_id) {
      return false;
    }

    const resumeUnitId = progress.resume_position.unit_id;
    const resumeLessonId = progress.resume_position.lesson_id;

    // Find the current unit to get its lft
    const currentUnit = units.find(unit => unit.id === resumeUnitId);

    if (!currentUnit) {
      return false;
    }

    const targetUnit = units.find(unit => unit.id === unitId);

    if (!targetUnit || !targetUnit.children?.results) {
      return false;
    }

    // If this unit comes before the current unit, all lessons are available
    if (targetUnit.lft < currentUnit.lft) {
      return true;
    }

    // If this is the current unit
    if (unitId === resumeUnitId) {
      // If a unitId is provided without a current lesson, the unit is complete
      // and the lesson should be available
      if (!resumeLessonId) {
        return true;
      }

      const lessons = targetUnit.children.results;
      const resumeLesson = lessons.find(lesson => lesson.id === resumeLessonId);
      const targetLesson = lessons.find(lesson => lesson.id === lessonId);

      if (!resumeLesson || !targetLesson) {
        return false;
      }

      // Check if target lesson's lft <= resume lesson's lft
      return targetLesson.lft <= resumeLesson.lft;
    }

    return false;
  }

  function isCurrentCourseLesson(courseId, unitId, lessonId) {
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
    activeClassesCourses,
    activeClassesQuizzes,
    resumableClassesQuizzes,
    resumableClassesResources,
    learnerFinishedAllClasses,
    getClass,
    getClassActiveLessons,
    getClassActiveCourses,
    getClassActiveQuizzes,
    getClassLessonLink,
    getClassCourseLink,
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
    isCourseLessonAvailable,
    isCurrentCourseLesson,
  };
}
