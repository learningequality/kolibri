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
       * the lesson title if `true`
       */
      displayClassName: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      // TODO: Would be more consistent to have this computed property in `setup`,
      // however haven't found a way to work with translations there yet
      header() {
        return this.recent ? this.$tr('recentLessonsHeader') : this.$tr('yourLessonsHeader');
      },
    },
    $trs: {
      recentLessonsHeader: {
        message: 'Recent lessons',
        context:
          "Section header on the learner's Home page, displaying the most recent lessons that the coaches assigned to them.",
      },
      yourLessonsHeader: {
        message: 'Your lessons',
        context:
          "Heading on the 'Learn' page for a section where a learner can see which lessons have been assigned to them.",
      },
      noLessonsMessage: {
        message: 'You have no lessons assigned',
        context: 'Message that a learner sees if a coach has not assigned any lessons to them.',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
