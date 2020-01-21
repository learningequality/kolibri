import { LessonsPageNames } from '../constants/lessonsConstants';

// IDEA kill these in favor of using vuex param autocomplete
// Creates a Link to the Lesson Summary Page
export function lessonSummaryLink({ classId, lessonId }) {
  return {
    name: LessonsPageNames.SUMMARY,
    params: {
      classId,
      lessonId,
    },
  };
}

// Creates a Link to the Channel Browsing Page for a Lesson
export function selectionRootLink({ classId, lessonId }) {
  return {
    name: LessonsPageNames.SELECTION_ROOT,
    params: {
      classId,
      lessonId,
    },
  };
}
