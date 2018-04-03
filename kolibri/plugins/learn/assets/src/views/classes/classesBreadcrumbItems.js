import { createTranslator } from 'kolibri.utils.i18n';
import { ClassesPageNames } from '../../constants';
import { classAssignmentsLink, lessonPlaylistLink } from './classPageLinks';

const translator = createTranslator('classesBreadcrumbItems', {
  allClassesBreadcrumb: 'Classes',
});

// A mixin intended for use inside of learn plugin breadcrumbs
export default {
  computed: {
    classesBreadcrumbs() {
      const defaultCrumbs = [
        // Link to All Classes Page
        {
          text: translator.$tr('allClassesBreadcrumb'),
          link: {
            name: ClassesPageNames.ALL_CLASSES,
          },
        },
        {
          // Link to Classroom Assignments page
          text: this.currentClassroom.name,
          link: classAssignmentsLink(this.currentClassroom.id),
        },
      ];
      switch (this.pageName) {
        case ClassesPageNames.CLASS_ASSIGNMENTS:
          return defaultCrumbs;
        case ClassesPageNames.LESSON_PLAYLIST:
          return [
            ...defaultCrumbs,
            {
              // Link to Lesson Playlist
              text: this.currentLesson.title,
              link: lessonPlaylistLink(this.currentLesson.id),
            },
          ];
        default:
          return [];
      }
    },
    showClassesBreadcrumbs() {
      return [
        // No breadcrumbs on ALL_CLASSES or LESSON_RESOURCE_VIEWER
        ClassesPageNames.CLASS_ASSIGNMENTS,
        ClassesPageNames.LESSON_PLAYLIST,
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
