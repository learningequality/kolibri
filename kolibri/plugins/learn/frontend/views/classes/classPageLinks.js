import { ClassesPageNames } from '../../constants';

export function classAssignmentsLink(classId) {
  return {
    name: ClassesPageNames.CLASS_ASSIGNMENTS,
    params: {
      classId,
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
