<template>

  <div>
    <h1>{{ $tr('title') }}</h1>
    <div ref="header">
      <h2>{{ $tr('questionOrder') }}</h2>
      <div>
        <KRadioButton
          v-model="fixedOrder"
          :label="coachStrings.$tr('orderRandomLabel')"
          :description="coachStrings.$tr('orderRandomDescription')"
          :value="false"
        />
        <KRadioButton
          v-model="fixedOrder"
          :label="coachStrings.$tr('orderFixedLabel')"
          :description="coachStrings.$tr('orderFixedDescription')"
          :value="true"
        />
      </div>
      <h2>{{ $tr('questions') }}</h2>
    </div>
    <KGrid>
      <KGridItem sizes="1, 3, 4">
        <div>
          {{ coachStrings.$tr('numberOfQuestions', { value: selectedQuestions.length }) }}
        </div>
        <div>
          <KButton
            :text="$tr('randomize')"
            appearance="basic-link"
            :primary="false"
            @click="getNewQuestionSet"
          />
        </div>
        <ol class="question-list">
          <AssessmentQuestionListItem
            v-for="(question, questionIndex) in selectedQuestions"
            :key="questionIndex"
            :questionNumberWithinExam="questionIndex + 1"
            :questionNumberWithinExercise="questionIndex"
            :totalFromExercise="selectedQuestions.length"
            :isSelected="isSelected(question)"
            :exerciseName="question.title"
            :isCoachContent="Boolean(numCoachContents(question.exercise_id))"
            @click="currentQuestionIndex = questionIndex"
          />
        </ol>
      </KGridItem>
      <KGridItem sizes="3, 5, 8">
        <ContentRenderer
          v-if="content && questionId"
          :id="content.id"
          ref="contentRenderer"
          :kind="content.kind"
          :files="content.files"
          :contentId="content.content_id"
          :available="content.available"
          :extraFields="content.extra_fields"
          :itemId="questionId"
          :assessment="true"
          :allowHints="false"
          :showCorrectAnswer="true"
          :interactive="false"
        />
      </KGridItem>
    </KGrid>
    <div>
      <KButton :text="coachStrings.$tr('goBackAction')" @click="close" />
      <KButton :text="coachStrings.$tr('finishAction')" primary @click="submit" />
    </div>
  </div>

</template>


<script>

  import { mapState, mapActions, mapMutations } from 'vuex';

  import ContentRenderer from 'kolibri.coreVue.components.ContentRenderer';
  import KButton from 'kolibri.coreVue.components.KButton';
  import KRadioButton from 'kolibri.coreVue.components.KRadioButton';
  import KGrid from 'kolibri.coreVue.components.KGrid';
  import KGridItem from 'kolibri.coreVue.components.KGridItem';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import AssessmentQuestionListItem from '../AssessmentQuestionListItem';
  import { coachStringsMixin } from '../../new/shared/commonCoachStrings';

  export default {
    name: 'CreateExamPreview',
    $trs: {
      title: 'Select questions',
      backLabel: 'Select topics or exercises',
      exercise: 'Exercise { num }',
      randomize: 'Choose a different set of questions',
      questionOrder: 'Question order',
      questions: 'Questions',
      newQuestions: 'New question set created',
    },
    components: {
      ContentRenderer,
      KButton,
      AssessmentQuestionListItem,
      KRadioButton,
      KGrid,
      KGridItem,
    },
    mixins: [responsiveWindow, coachStringsMixin],
    data() {
      return {
        currentQuestionIndex: 0,
        questions: [],
        fixedOrder: true,
      };
    },
    computed: {
      ...mapState('examCreation', [
        'selectedQuestions',
        'selectedExercises',
        'learnersSeeFixedOrder',
      ]),
      ...mapState(['toolbarRoute']),
      currentQuestion() {
        return this.selectedQuestions[this.currentQuestionIndex] || {};
      },
      exercises() {
        const exercises = {};
        this.selectedExercises.forEach(exercise => {
          exercises[exercise.id] = exercise;
        });
        return exercises;
      },
      content() {
        return this.exercises[this.currentQuestion.exercise_id];
      },
      questionId() {
        return this.currentQuestion.question_id;
      },
    },
    watch: {
      fixedOrder(value) {
        this.setVuexFixedOrder(value);
      },
    },
    mounted() {
      this.fixedOrder = this.learnersSeeFixedOrder;
    },
    methods: {
      ...mapMutations('examCreation', {
        setVuexFixedOrder: 'SET_FIXED_ORDER',
      }),
      ...mapActions('examCreation', ['getNewQuestionSet']),
      numCoachContents(exerciseId) {
        return this.exercises[exerciseId].num_coach_contents;
      },
      isSelected(question) {
        return (
          this.currentQuestion.question_id === question.question_id &&
          this.currentQuestion.exercise_id === question.exercise_id
        );
      },
      close() {
        this.$router.push(this.toolbarRoute);
      },
      submit() {
        this.$emit('submit');
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

</style>
