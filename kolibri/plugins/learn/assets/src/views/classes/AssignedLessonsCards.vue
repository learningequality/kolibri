<template>

  <div>
    <h2>
      <KLabeledIcon
        icon="lesson"
        :label="header"
      />
    </h2>

    <CardGrid
      v-if="lessons && lessons.length > 0"
      :gridType="1"
    >
      <LessonCard
        v-for="lesson in lessons"
        :key="lesson.id"
        :lesson="lesson"
        :to="getClassLessonLink(lesson)"
        :collectionTitle="displayClassName ? getLessonClassName(lesson) : ''"
      />
    </CardGrid>

    <p v-else>
      {{ $tr('noLessonsMessage') }}
    </p>
  </div>

</template>


<script>

  import useLearnerResources from '../../composables/useLearnerResources';
  import LessonCard from '../cards/LessonCard';
  import CardGrid from '../cards/CardGrid';

  export default {
    name: 'AssignedLessonsCards',
    components: {
      CardGrid,
      LessonCard,
    },
    setup() {
      const { getClass, getClassLessonLink } = useLearnerResources();

      // TODO: We only display class name for lessons on the home page
      // that fetches classes data to `useLearnerResources`. To save some
      // API calls, it's not fetched here again. However that creates a hidden
      // dependency to `HomePage`. Make sure to check that classes are available
      // when initializing the composable and if not, fetch them, or update
      // `ClassAssignmentsPage` to use the composable too instead of Vuex.
      function getLessonClassName(lesson) {
        const lessonClass = getClass(lesson.collection);
        return lessonClass ? lessonClass.name : '';
      }

      return { getLessonClassName, getClassLessonLink };
    },
    props: {
      lessons: {
        type: Array,
        required: true,
      },
      /**
       * If `true` 'Recent lessons' header will be displayed.
       * Otherwise 'Your lessons' will be displayed.
       */
      recent: {
        type: Boolean,
        default: false,
      },
      /**
       * A lesson's class name will be displayed above
       * the lesson lesson title if `true`
       */
      displayClassName: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      // Would be more consistent to have this computed property in `setup`,
      // however haven't found a way to work with translations there yet
      header() {
        return this.recent ? this.$tr('recentLessonsHeader') : this.$tr('yourLessonsHeader');
      },
    },
    $trs: {
      yourLessonsHeader: 'Your lessons',
      recentLessonsHeader: 'Recent lessons',
      noLessonsMessage: {
        message: 'You have no lessons assigned',
        context: 'Message that a learner sees if a coach has not assigned any lessons to them.',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
