import { PageNames, ClassesPageNames } from '../../constants';

export function classAssignmentsLink(classId) {
  return {
      name: ClassesPageNames.CLASS_ASSIGNMENTS,
      params: {
        classId,
      }
  }
}

// TODO update with the new Lesson Resource Viewer Page
export function lessonResourceViewerLink(nodeId) {
  return {
    name: PageNames.TOPICS_CONTENT,
    params: {
      id: nodeId,
    }
  }
}

export function examViewerLink(examId) {
  return {
    name: ClassesPageNames.EXAM_VIEWER,
    params: {
      examId,
      questionNumber: 0,
    }
  }
}

export function lessonPlaylistLink(lessonId) {
  return {
    name: ClassesPageNames.LESSON_PLAYLIST,
    params: {
      lessonId,
    },
  }
}
