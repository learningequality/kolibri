<template>

  <CoachImmersivePage
    :appBarTitle="title"
    :authorized="$store.getters.userIsAuthorizedForCoach"
    authorizedRole="adminOrCoach"
    icon="close"
    :pageTitle="title"
    :route="backRouteForQuery($route.query)"
  >
    <KPageContainer v-if="!loading">
      <h1>
        <KLabeledIcon
          icon="quiz"
          :label="quiz.title"
        />
      </h1>
      <p>
        {{ orderDescriptionString }}
      </p>

      <QuestionListPreview
        :fixedOrder="!quizIsRandomized"
        :readOnly="true"
        :selectedQuestions="selectedQuestions"
        :selectedExercises="selectedExercises"
      />
    </KPageContainer>
  </CoachImmersivePage>

</template>


<script>

  import fromPairs from 'lodash/fromPairs';
  import commonCoach from '../common';
  import CoachImmersivePage from '../CoachImmersivePage';
  import QuestionListPreview from '../plan/CreateExamPage/QuestionListPreview';
  import { fetchQuizSummaryPageData } from '../plan/QuizSummaryPage/api';

  export default {
    name: 'ReportsQuizPreviewPage',
    components: {
      CoachImmersivePage,
      QuestionListPreview,
    },
    mixins: [commonCoach],
    data() {
      return {
        quiz: {
          assignments: [],
          learners_see_fixed_order: false,
          question_sources: [],
          title: '',
        },
        selectedExercises: {},
        loading: true,
      };
    },
    computed: {
      selectedQuestions() {
        return this.quiz.question_sources;
      },
      quizIsRandomized() {
        return !this.quiz.learners_see_fixed_order;
      },
      orderDescriptionString() {
        return this.quizIsRandomized
          ? this.coachString('orderRandomDescription')
          : this.coachString('orderFixedDescription');
      },
      title() {
        return this.$tr('pageTitle', { title: this.quiz.title });
      },
    },
    beforeRouteEnter(to, from, next) {
      // Use the same data-fetching as QuizSummaryPage to make sure we have
      // all of the Quiz and ContentNode data to render the preview
      return fetchQuizSummaryPageData(to.params.quizId)
        .then(data => {
          next(vm => vm.setData(data));
        })
        .catch(error => {
          next(vm => vm.setError(error));
        });
    },
    methods: {
      setData(data) {
        const { exam, exerciseContentNodes } = data;
        this.quiz = exam;
        this.selectedExercises = fromPairs(exerciseContentNodes.map(x => [x.id, x]));
        this.loading = false;
        this.$store.dispatch('notLoading');
      },
      setError(error) {
        this.$store.dispatch('handleApiError', { error });
        this.loading = false;
        this.$store.dispatch('notLoading');
      },
    },
    $trs: {
      pageTitle: {
        message: `Preview of quiz '{title}'`,
        context: "Title that displays when use selects the 'Preview' option of a quiz.",
      },
    },
  };

</script>


<style lang="scss" scoped></style>
