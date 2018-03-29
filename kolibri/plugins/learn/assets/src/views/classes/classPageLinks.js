import { ClassesPageNames } from '../../constants';

export function classAssignmentsLink(classId) {
  return {
    name: ClassesPageNames.CLASS_ASSIGNMENTS,
    params: {
      classId,
    },
  };
}

export function lessonResourceViewerLink(resourceNumber) {
  return {
    name: ClassesPageNames.LESSON_RESOURCE_VIEWER,
    params: {
      resourceNumber,
    },
  };
}

export function examViewerLink(examId) {
  return {
    name: ClassesPageNames.EXAM_VIEWER,
    params: {
      examId,
      questionNumber: 0,
    },
  };
}

export function examReportViewerLink(examId) {
  return {
    name: ClassesPageNames.EXAM_REPORT_VIEWER,
    params: {
      examId,
      questionNumber: 0,
      questionInteraction: 0,
    },
  };
}

export function lessonPlaylistLink(lessonId) {
  return {
    name: ClassesPageNames.LESSON_PLAYLIST,
    params: {
      lessonId,
    },
  };
}
