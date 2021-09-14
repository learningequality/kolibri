<template>

  <div>
    <h2>
      <KLabeledIcon icon="lesson" :label="$tr('yourLessonsHeader')" />
    </h2>

    <CardGrid v-if="items.length > 0" :gridType="1">
      <LessonCard
        v-for="lesson in items"
        :key="lesson.id"
        :lesson="lesson"
        :collectionTitle="currentClassroomName"
        :to="getClassLessonLink(lesson)"
      />
    </CardGrid>

    <p v-else>
      {{ $tr('noLessonsMessage') }}
    </p>
  </div>

</template>


<script>

  import { computed } from 'kolibri.lib.vueCompositionApi';
  import useLearnerResources from '../../composables/useLearnerResources';
  import LessonCard from '../cards/LessonCard';
  import CardGrid from '../cards/CardGrid';

  export default {
    name: 'AssignedLessonsCards',
    components: {
      CardGrid,
      LessonCard,
    },
    setup(_, { root }) {
      const { getClassLessonLink } = useLearnerResources();

      const currentClassroomName = computed(() => {
        const currentClassroom = root.$store.state.classAssignments.currentClassroom;
        return currentClassroom ? currentClassroom.name : '';
      });

      return {
        getClassLessonLink,
        currentClassroomName,
      };
    },
    props: {
      items: {
        type: Array,
        required: true,
      },
    },
    $trs: {
      yourLessonsHeader: 'Your lessons',
      noLessonsMessage: {
        message: 'You have no lessons assigned',
        context: 'Message that a learner sees if a coach has not assigned any lessons to them.',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
