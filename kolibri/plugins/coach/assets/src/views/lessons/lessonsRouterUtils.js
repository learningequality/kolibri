import { LessonsPageNames } from '../../lessonsConstants';

// Creates a Link to the Lesson Summary Page
export function lessonSummaryLink({ lessonId, classId }) {
  return {
    name: LessonsPageNames.SUMMARY,
    params: {
      classId,
      lessonId,
    },
  };
}
