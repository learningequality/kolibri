import { ClassesPageNames } from '../../constants';
import { createTranslator } from 'kolibri.utils.i18n';

const translator = createTranslator('classesBreadcrumbItems', {
  allClassesBreadcrumb: 'Classes',
});

const allClassesCrumb = {
  text: translator.$tr('allClassesBreadcrumb'),
  link: {
    name: ClassesPageNames.ALL_CLASSES,
  },
};

const classAssignmentsCrumb = classroomName => {
  return {
    text: classroomName,
    link: {
      name: ClassesPageNames.CLASS_ASSIGNMENTS,
    },
  };
};

const lessonPlaylistCrumb = lessonName => {
  return {
    text: lessonName,
    link: {
      name: ClassesPageNames.LESSON_PLAYLIST,
    },
  };
};

// A mixin intended for use inside of learn plugin breadcrumbs
export default {
  computed: {
    classesBreadcrumbs() {
      const defaultCrumbs = [allClassesCrumb, classAssignmentsCrumb(this.currentClassroom.name)];
      switch (this.pageName) {
        case ClassesPageNames.CLASS_ASSIGNMENTS:
          return defaultCrumbs;
        case ClassesPageNames.LESSON_PLAYLIST:
          return [...defaultCrumbs, lessonPlaylistCrumb(this.currentLesson.name)];
        default:
          return [];
      }
    },
    showClassesBreadcrumbs() {
      return [
        // No breadcrumbs on ALL_CLASSES
        ClassesPageNames.CLASS_ASSIGNMENTS,
        ClassesPageNames.LESSON_PLAYLIST,
        // TODO: Resource viewer
      ].includes(this.pageName);
    },
  },
  vuex: {
    getters: {
      currentClassroom(state) {
        switch (state.pageName) {
          case ClassesPageNames.CLASS_ASSIGNMENTS:
            return state.pageState.currentClassroom;
          case ClassesPageNames.LESSON_PLAYLIST:
            return state.pageState.currentLesson.classroom;
          default:
            return {};
        }
      },
      currentLesson(state) {
        if (state.pageName === ClassesPageNames.LESSON_PLAYLIST) {
          return state.pageState.currentLesson;
        } else {
          return {};
        }
      },
      pageName: state => state.pageName,
    },
  },
};
