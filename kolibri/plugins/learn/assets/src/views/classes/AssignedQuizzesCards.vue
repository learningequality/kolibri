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
        :to="getClassQuizLink(quiz)"
        :collectionTitle="currentClassroomName"
      />
    </CardGrid>
    <p v-else>
      {{ $tr('noQuizzesMessage') }}
    </p>

  </div>

</template>


<script>

  import { computed } from 'kolibri.lib.vueCompositionApi';
  import QuizCard from '../cards/QuizCard';
  import CardGrid from '../cards/CardGrid';
  import useLearnerResources from '../HomePage/useLearnerResources';

  export default {
    name: 'AssignedQuizzesCards',
    components: {
      CardGrid,
      QuizCard,
    },
    setup(props, { root }) {
      const { getClassQuizLink } = useLearnerResources();

      const currentClassroomName = computed(() => {
        const currentClassroom = root.$store.state.classAssignments.currentClassroom;
        return currentClassroom ? currentClassroom.name : '';
      });

      const visibleItems = computed(() => {
        if (!props.items) {
          return [];
        }
        return props.items.filter(quiz => {
          if (!quiz.active) {
            return false;
          } else if (quiz.archive) {
            // Closed (archived) quizzes only show if the learner started/submitted
            return quiz.progress.started || quiz.progress.closed;
          } else {
            return true;
          }
        });
      });

      return {
        getClassQuizLink,
        currentClassroomName,
        visibleItems,
      };
    },
    props: {
      // `items` prop is used in `setup`
      // eslint-disable-next-line kolibri/vue-no-unused-properties
      items: {
        type: Array,
        required: true,
      },
    },
    $trs: {
      yourQuizzesHeader: {
        message: 'Your quizzes',
        context:
          "AssignedQuizzesCards.yourQuizzesHeader\n\nHeading on the 'Learn' page for a section where a learner can see the assigned quizzes.",
      },
      noQuizzesMessage: 'You have no quizzes assigned',
    },
  };

</script>


<style lang="scss" scoped></style>
