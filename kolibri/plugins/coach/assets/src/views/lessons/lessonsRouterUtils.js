import { LessonsPageNames } from '../../lessonsConstants';

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

// Creates a Link to the Lesson Root Page for a Classroom
export function selectionRootLink({ classId, lessonId }) {
  return {
    name: LessonsPageNames.SELECTION_ROOT,
    params: {
      classId,
      lessonId,
    },
  };
}
