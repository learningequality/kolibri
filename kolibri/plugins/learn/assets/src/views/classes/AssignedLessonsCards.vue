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
        :classroom="currentClassroom"
      />
    </CardGrid>

    <p v-else>
      {{ $tr('noLessonsMessage') }}
    </p>
  </div>

</template>


<script>

  import LessonCard from '../cards/LessonCard.vue';
  import CardGrid from '../cards/CardGrid.vue';

  export default {
    name: 'AssignedLessonsCards',
    components: {
      CardGrid,
      LessonCard,
    },
    props: {
      items: {
        type: Array,
        required: true,
      },
    },
    computed: {
      currentClassroom() {
        return this.$store.state.classAssignments.currentClassroom;
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
