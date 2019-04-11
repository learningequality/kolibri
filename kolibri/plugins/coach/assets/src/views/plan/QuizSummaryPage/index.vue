<template>

  <CoreBase
    :immersivePage="false"
    :authorized="true"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
    appBarTitle="Coach"
  >

    <TopNavbar slot="sub-nav" />

    <KPageContainer v-if="!loading">

      <section>
        <div class="with-flushed-button">
          <p>
            <BackLink
              :to="$router.getRoute('EXAMS')"
              :text="$tr('allQuizzes')"
            />
          </p>
          <QuizOptionsDropdownMenu />
        </div>
        <h1>
          {{ quiz.title }}
        </h1>
      </section>

      <section>
        <HeaderTable>
          <HeaderTableRow>
            <span slot="key">
              {{ coachStrings.$tr('statusLabel') }}
            </span>
            <span slot="value">
              <QuizActive :active="quiz.active" />
            </span>
          </HeaderTableRow>
          <HeaderTableRow>
            <span slot="key">
              {{ coachStrings.$tr('recipientsLabel') }}
            </span>
            <span slot="value">
              <Recipients :groupNames="learnerGroups" />
            </span>
          </HeaderTableRow>
          <HeaderTableRow>
            <span slot="key">
              {{ coachStrings.$tr('questionOrderLabel') }}
            </span>
            <span slot="value">
              {{ questionOrderValueString }}
            </span>
          </HeaderTableRow>
        </HeaderTable>
      </section>

      <section v-if="selectedQuestions">
        <h2>
          {{ coachStrings.$tr('numberOfQuestions', { value: selectedQuestions.length }) }}
        </h2>

        <p>
          {{ orderDescriptionString }}
        </p>

        <QuestionListPreview
          v-if="!error && selectedQuestions"
          :fixedOrder="!quizIsRandomized"
          :readOnly="true"
          :selectedQuestions="selectedQuestions"
          :selectedExercises="selectedExercises"
        />
        <p v-if="error">
          {{ $tr('pageLoadingError') }}
        </p>
      </section>
    </KPageContainer>
  </CoreBase>

</template>


<script>

  import fromPairs from 'lodash/fromPairs';
  import find from 'lodash/find';
  import KPageContainer from 'kolibri.coreVue.components.KPageContainer';
  import { CoachCoreBase } from '../../common';
  import BackLink from '../../common/BackLink';
  import HeaderTable from '../../common/HeaderTable';
  import HeaderTableRow from '../../common/HeaderTable/HeaderTableRow';
  import QuizActive from '../../common/QuizActive';
  import Recipients from '../../common/Recipients';
  import TopNavbar from '../../TopNavbar';
  import QuestionListPreview from '../CreateExamPage/QuestionListPreview';
  import { coachStrings } from '../../common/commonCoachStrings';
  import QuizOptionsDropdownMenu from './QuizOptionsDropdownMenu';
  import { fetchQuizSummaryPageData } from './api';

  export default {
    name: 'QuizSummaryPage',
    components: {
      BackLink,
      CoreBase: CoachCoreBase,
      HeaderTable,
      HeaderTableRow,
      KPageContainer,
      QuestionListPreview,
      QuizActive,
      QuizOptionsDropdownMenu,
      Recipients,
      TopNavbar,
    },
    data() {
      return {
        quiz: {},
        selectedExercises: {},
        learnerGroups: [],
        error: null,
        loading: true,
      };
    },
    beforeRouteEnter(to, from, next) {
      return fetchQuizSummaryPageData(to.params.quizId)
        .then(data => {
          next(vm => vm.setData(data));
        })
        .catch(err => {
          next(vm => {
            vm.error = err;
          });
        });
    },
    computed: {
      selectedQuestions() {
        if (this.quiz.question_sources) {
          return this.quiz.question_sources;
        }
        return null;
      },
      quizIsRandomized() {
        return this.quiz.learners_see_fixed_order;
      },
      coachStrings() {
        return coachStrings;
      },
      questionOrderValueString() {
        return this.quizIsRandomized
          ? this.coachStrings.$tr('orderRandomLabel')
          : this.coachStrings.$tr('orderFixedLabel');
      },
      orderDescriptionString() {
        return this.quizIsRandomized
          ? this.coachStrings.$tr('orderRandomDescription')
          : this.coachStrings.$tr('orderFixedDescription');
      },
    },
    methods: {
      setData(data) {
        const { exam, exerciseContentNodes, learnerGroups } = data;
        this.quiz = exam;
        this.selectedExercises = fromPairs(exerciseContentNodes.map(x => [x.id, x]));
        learnerGroups.forEach(lg => {
          if (find(exam.assignments, { collection: lg.id })) {
            this.learnerGroups.push(lg.name);
          }
        });
        this.loading = false;
        this.$store.dispatch('notLoading');
      },
      goToActionPage(action) {
        console.log(action);
      },
    },
    $trs: {
      pageLoadingError: 'There was a problem loading this quiz',
      allQuizzes: 'All quizzes',
    },
  };

</script>


<style lang="scss" scoped>

  // Copied from CoachExamsPage and other places
  .with-flushed-button {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    button {
      align-self: flex-end;
    }
  }

</style>
