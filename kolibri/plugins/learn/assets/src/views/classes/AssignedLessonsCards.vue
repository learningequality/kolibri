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
      noLessonsMessage: 'You have no lessons assigned',
    },
  };

</script>


<style lang="scss" scoped></style>
