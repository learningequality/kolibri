<template>

  <div>
    <h2>
      <KLabeledIcon
        icon="quiz"
        :label="header"
      />
    </h2>

    <CardGrid
      v-if="visibleQuizzes.length > 0"
      :gridType="1"
    >
      <QuizCard
        v-for="quiz in visibleQuizzes"
        :key="quiz.id"
        :quiz="quiz"
        :to="getClassQuizLink(quiz)"
        :collectionTitle="displayClassName ? getQuizClassName(quiz) : ''"
      />
    </CardGrid>
    <p v-else>
      {{ $tr('noQuizzesMessage') }}
    </p>

  </div>

</template>


<script>

  import { computed } from 'kolibri.lib.vueCompositionApi';
  import useLearnerResources from '../../composables/useLearnerResources';
  import QuizCard from '../cards/QuizCard';
  import CardGrid from '../cards/CardGrid';

  export default {
    name: 'AssignedQuizzesCards',
    components: {
      CardGrid,
      QuizCard,
    },
    setup(props) {
      const { getClass, getClassQuizLink } = useLearnerResources();

      const visibleQuizzes = computed(() => {
        if (!props.quizzes) {
          return [];
        }
        return props.quizzes.filter(quiz => {
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

      // TODO: We only display class name for quizzes on the home page
      // that fetches classes data to `useLearnerResources`. To save some
      // API calls, it's not fetched here again. However that creates a hidden
      // dependency to `HomePage`. Make sure to check that classes are available
      // when initializing the composable and if not, fetch them, or update
      // `ClassAssignmentsPage` to use the composable too instead of Vuex.
      function getQuizClassName(quiz) {
        const quizClass = getClass(quiz.collection);
        return quizClass ? quizClass.name : '';
      }

      return {
        visibleQuizzes,
        getQuizClassName,
        getClassQuizLink,
      };
    },
    props: {
      // `quizzes` prop is used in `setup`
      // eslint-disable-next-line kolibri/vue-no-unused-properties
      quizzes: {
        type: Array,
        required: true,
      },
      /**
       * If `true` 'Recent quizzes' header will be displayed.
       * Otherwise 'Your quizzes' will be displayed.
       */
      recent: {
        type: Boolean,
        default: false,
      },
      /**
       * A quiz's class name will be displayed above
       * the quiz title if `true`
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
        return this.recent ? this.$tr('recentQuizzesHeader') : this.$tr('yourQuizzesHeader');
      },
    },
    $trs: {
      yourQuizzesHeader: {
        message: 'Your quizzes',
        context:
          "AssignedQuizzesCards.yourQuizzesHeader\n\nHeading on the 'Learn' page for a section where a learner can see which quizzes have been assigned to them.",
      },
      noQuizzesMessage: {
        message: 'You have no quizzes assigned',
        context: 'Message that a learner sees if a coach has not assigned any quizzes to them.',
      },
      recentQuizzesHeader: 'Recent quizzes',
    },
  };

</script>


<style lang="scss" scoped></style>
