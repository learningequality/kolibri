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

// Creates a Link to a Topic Listing Page for a Lesson
export function topicListingLink({ classId, lessonId, topicId }) {
  return {
    name: LessonsPageNames.SELECTION,
    params: {
      classId,
      lessonId,
      topicId,
    },
  };
}
