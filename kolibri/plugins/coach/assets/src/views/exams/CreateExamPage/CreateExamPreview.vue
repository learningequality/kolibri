<template>

  <div class="wrapper">
    <h1>{{ $tr('title') }}</h1>
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
    <div>
      <KButton
        :text="$tr('randomize')"
        appearance="basic-link"
        :primary="false"
        @click="getNewQuestionSet"
      />
    </div>
    <hr>
    <KGrid>
      <KGridItem sizes="4, 4, 5" class="list-wrapper">
        <ul v-if="fixedOrder" class="question-list">
          <Draggable
            :value="selectedQuestions"
            :options="{animation:150}"
            @input="handleDrag($event)"
          >
            <QuestionListItemOrdered
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
          </Draggable>
        </ul>
        <ul v-else class="question-list">
          <QuestionListItemRandom
            v-for="(question, questionIndex) in selectedQuestions"
            :key="questionIndex"
            :isSelected="isSelected(question)"
            :exerciseName="question.title"
            :isCoachContent="Boolean(numCoachContents(question.exercise_id))"
            @click="currentQuestionIndex = questionIndex"
          />
        </ul>
        <ol v-if="fixedOrder" class="numbers">
          <li
            v-for="(question, questionIndex) in selectedQuestions"
            :key="questionIndex"
          ></li>
        </ol>
      </KGridItem>
      <KGridItem sizes="4, 4, 7">
        <h3 class="question-title">{{ currentQuestion.title }}</h3>
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
    <Bottom>
      <KButton
        appearance="flat-button"
        :text="coachStrings.$tr('goBackAction')"
        @click="close"
      />
      <KButton
        :text="coachStrings.$tr('finishAction')"
        primary
        @click="submit"
      />
    </Bottom>
  </div>

</template>


<script>

  import { mapState, mapActions, mapMutations } from 'vuex';

  import Draggable from 'vuedraggable';
  import ContentRenderer from 'kolibri.coreVue.components.ContentRenderer';
  import KButton from 'kolibri.coreVue.components.KButton';
  import KRadioButton from 'kolibri.coreVue.components.KRadioButton';
  import KGrid from 'kolibri.coreVue.components.KGrid';
  import KGridItem from 'kolibri.coreVue.components.KGridItem';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import { coachStringsMixin } from '../../new/shared/commonCoachStrings';
  import QuestionListItemRandom from './QuestionListItemRandom';
  import QuestionListItemOrdered from './QuestionListItemOrdered';
  import Bottom from './Bottom';

  export default {
    name: 'CreateExamPreview',
    metaInfo() {
      return {
        title: this.$tr('title'),
      };
    },
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
      Draggable,
      ContentRenderer,
      KButton,
      QuestionListItemRandom,
      QuestionListItemOrdered,
      KRadioButton,
      KGrid,
      KGridItem,
      Bottom,
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
      ...mapActions('examCreation', ['getNewQuestionSet', 'createExamAndRoute']),
      numCoachContents(exerciseId) {
        return this.exercises[exerciseId].num_coach_contents;
      },
      isSelected(question) {
        return (
          this.currentQuestion.question_id === question.question_id &&
          this.currentQuestion.exercise_id === question.exercise_id
        );
      },
      handleDrag(questions) {
        console.table(questions);
      },
      close() {
        this.$router.push(this.toolbarRoute);
      },
      submit() {
        this.createExamAndRoute();
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  hr {
    margin-top: 24px;
    margin-bottom: 8px;
  }

  .list-wrapper {
    position: relative;
  }

  .question-list {
    padding: 0;
    list-style: none;
  }

  .question-title {
    text-align: center;
  }

  .numbers {
    position: absolute;
    top: 0;
    left: 0;

    li {
      padding: 8px;
    }
  }

  .sortable-ghost {
    visibility: hidden;
  }

  .sortable-ghost * {
    visibility: hidden;
  }

  .wrapper {
    padding: 16px;
    background-color: white;
  }

</style>
