<template>

  <CoachImmersivePage
    :loading="pageLoading"
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
        :sections="quiz.question_sources || []"
        :selectedExercises="selectedExercises"
      />
    </KPageContainer>
  </CoachImmersivePage>

</template>


<script>

  import fromPairs from 'lodash/fromPairs';
  import { enhancedQuizManagementStrings } from 'kolibri-common/strings/enhancedQuizManagementStrings';
  import { handleApiError } from 'kolibri/utils/appError';
  import { pageLoading } from 'kolibri-common/composables/usePageLoading';
  import commonCoach from '../../common';
  import CoachImmersivePage from '../../CoachImmersivePage';
  import QuestionListPreview from '../CreateExamPage/QuestionListPreview';
  import { fetchQuizSummaryPageData } from '../QuizSummaryPage/api';

  export default {
    name: 'QuizPreviewPage',
    components: {
      CoachImmersivePage,
      QuestionListPreview,
    },
    mixins: [commonCoach],
    setup() {
      const { randomizedSectionOptionDescription$, fixedSectionOptionDescription$ } =
        enhancedQuizManagementStrings;
      return {
        pageLoading,
        randomizedSectionOptionDescription$,
        fixedSectionOptionDescription$,
        handleApiError,
      };
    },
    data() {
      return {
        quiz: {
          learners_see_fixed_order: false,
          question_sources: [],
          title: '',
        },
        selectedExercises: {},
        loading: true,
      };
    },
    computed: {
      quizIsRandomized() {
        return !this.quiz.learners_see_fixed_order;
      },
      orderDescriptionString() {
        return this.quizIsRandomized
          ? this.randomizedSectionOptionDescription$()
          : this.fixedSectionOptionDescription$();
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
      /**
       * Called by the router guard after page data is fetched successfully to populate the view.
       * @param {object} data - Page data returned by the API, including exam and exercise nodes.
       * @public
       */
      setData(data) {
        const { exam, exerciseContentNodes } = data;
        this.quiz = exam;
        this.selectedExercises = fromPairs(exerciseContentNodes.map(x => [x.id, x]));
        this.loading = false;
        pageLoading.value = false;
      },
      /**
       * Called by the router guard when page data fetching fails to surface the error.
       * @param {object} error - The error returned by the failed API request.
       * @public
       */
      setError(error) {
        this.handleApiError({ error });
        this.loading = false;
        pageLoading.value = false;
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
