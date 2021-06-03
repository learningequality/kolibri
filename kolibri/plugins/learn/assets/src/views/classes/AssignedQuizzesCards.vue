<template>

  <div>
    <h2>
      <KLabeledIcon icon="quiz" :label="$tr('yourQuizzesHeader')" />
    </h2>

    <CardGrid v-if="visibleItems.length > 0" :gridType="1">
      <QuizCard
        v-for="quiz in visibleItems"
        :key="quiz.id"
        :quiz="quiz"
        :classroom="currentClassroom"
      />
    </CardGrid>
    <p v-else>
      {{ $tr('noQuizzesMessage') }}
    </p>

  </div>

</template>


<script>

  import QuizCard from '../cards/QuizCard.vue';
  import CardGrid from '../cards/CardGrid.vue';

  export default {
    name: 'AssignedQuizzesCards',
    components: {
      CardGrid,
      QuizCard,
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
      visibleItems() {
        return this.items.filter(quiz => {
          if (!quiz.active) {
            return false;
          } else if (quiz.archive) {
            // Closed (archived) quizzes only show if the learner started/submitted
            return quiz.progress.started || quiz.progress.closed;
          } else {
            return true;
          }
        });
      },
    },
    $trs: {
      yourQuizzesHeader: 'Your quizzes',
      noQuizzesMessage: 'You have no quizzes assigned',
    },
  };

</script>


<style lang="scss" scoped></style>
