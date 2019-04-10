<template>

  <div>
    <section>
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
            <QuizActive :active="false" />
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
        :fixedOrder="true"
        :selectedQuestions="selectedQuestions"
        :selectedExercises="selectedExercises"
      />
      <p v-if="error">
        {{ $tr('pageLoadingError') }}
      </p>
    </section>
  </div>

</template>


<script>

  import fromPairs from 'lodash/fromPairs';
  import find from 'lodash/find';
  import HeaderTable from '../../common/HeaderTable';
  import HeaderTableRow from '../../common/HeaderTable/HeaderTableRow';
  import QuizActive from '../../common/QuizActive';
  import Recipients from '../../common/Recipients';
  import QuestionListPreview from '../CreateExamPage/QuestionListPreview';
  import { coachStrings } from '../../common/commonCoachStrings';
  import { fetchQuizSummaryPageData } from './api';

  export default {
    name: 'QuizSummaryPage',
    components: {
      HeaderTable,
      HeaderTableRow,
      QuestionListPreview,
      QuizActive,
      Recipients,
    },
    data() {
      return {
        quiz: {},
        selectedExercises: {},
        learnerGroups: [],
        error: null,
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
          ? coachStrings.$tr('orderRandomLabel')
          : coachStrings.$tr('orderFixedLabel');
      },
      orderDescriptionString() {
        return this.quizIsRandomized
          ? coachStrings.$tr('orderRandomDescription')
          : coachStrings.$tr('orderFixedDescription');
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
      },
    },
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
