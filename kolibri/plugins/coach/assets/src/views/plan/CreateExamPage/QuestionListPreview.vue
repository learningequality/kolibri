<template>

  <KGrid>
    <KGridItem
      :layout8="{ span: 4 }"
      :layout12="{ span: 5 }"
      class="list-wrapper"
    >
      <ul class="question-list">
        <AssessmentQuestionListItem
          v-for="(question, questionIndex) in annotatedQuestions"
          :key="listKey(question)"
          :draggable="false"
          :isSelected="isSelected(question)"
          :exerciseName="
            displayQuestionTitle(question, selectedExercises[question.exercise_id].title)
          "
          :isCoachContent="numCoachContents(question.exercise_id)"
          :available="available(question.exercise_id)"
          @select="currentQuestionIndex = questionIndex"
        />
      </ul>

      <transition name="fade-numbers">
        <ol
          v-if="fixedOrder"
          class="list-labels"
          aria-hidden
        >
          <li
            v-for="(question, questionIndex) in selectedQuestions"
            :key="questionIndex"
          ></li>
        </ol>
        <ul
          v-else
          class="list-labels"
          aria-hidden
        >
          <li
            v-for="(question, questionIndex) in selectedQuestions"
            :key="questionIndex"
          ></li>
        </ul>
      </transition>
    </KGridItem>
    <KGridItem
      :layout8="{ span: 4 }"
      :layout12="{ span: 7 }"
    >
      <h3
        v-if="content && content.available"
        class="question-title"
      >
        {{ displayQuestionTitle(currentQuestion, content.title) }}
      </h3>
      <ContentRenderer
        v-if="content && content.available && questionId"
        ref="contentRenderer"
        :kind="content.kind"
        :files="content.files"
        :available="content.available"
        :extraFields="content.extra_fields"
        :itemId="questionId"
        :assessment="true"
        :allowHints="false"
        :showCorrectAnswer="true"
        :interactive="false"
      />
      <p v-else>
        <KIcon
          icon="warning"
          :style="{ fill: $themePalette.yellow.v_1100 }"
        />
        {{ resourceMissingText }}
      </p>
    </KGridItem>
  </KGrid>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { displayQuestionTitle } from 'kolibri-common/strings/enhancedQuizManagementStrings';
  import AssessmentQuestionListItem from './AssessmentQuestionListItem';

  export default {
    name: 'QuestionListPreview',
    components: {
      AssessmentQuestionListItem,
    },
    mixins: [commonCoreStrings],
    setup() {
      return {
        displayQuestionTitle,
      };
    },
    props: {
      // If set to true, question buttons will be draggable
      fixedOrder: {
        type: Boolean,
        required: true,
      },
      // Array of { question_id, exercise_id, title } from Exam.question_sources
      selectedQuestions: {
        type: Array,
        required: true,
      },
      // A Map(id, ContentNode)
      selectedExercises: {
        type: Object,
        required: true,
      },
    },
    data() {
      return {
        currentQuestionIndex: 0,
      };
    },
    computed: {
      annotatedQuestions() {
        const counts = {};
        const totals = {};
        this.selectedQuestions.forEach(question => {
          if (!totals[question.exercise_id]) {
            totals[question.exercise_id] = 0;
          }
          totals[question.exercise_id] += 1;
          counts[this.listKey(question)] = totals[question.exercise_id];
        });
        return this.selectedQuestions.map(question => {
          if (totals[question.exercise_id] > 1) {
            question.counterInExercise = counts[this.listKey(question)];
          }
          const node = this.selectedExercises[question.exercise_id];
          question.missing_resource = !node || !node.available;
          return question;
        });
      },
      currentQuestion() {
        return this.selectedQuestions[this.currentQuestionIndex] || {};
      },
      content() {
        return this.selectedExercises[this.currentQuestion.exercise_id];
      },
      questionId() {
        return this.currentQuestion.question_id;
      },
      resourceMissingText() {
        return this.coreString('resourceNotFoundOnDevice');
      },
    },
    methods: {
      listKey(question) {
        return question.exercise_id + question.question_id;
      },
      numCoachContents(exerciseId) {
        // Do this to handle missing content
        return Boolean((this.selectedExercises[exerciseId] || {}).num_coach_contents);
      },
      available(exerciseId) {
        return Boolean(this.selectedExercises[exerciseId]);
      },
      isSelected(question) {
        return (
          this.currentQuestion.question_id === question.question_id &&
          this.currentQuestion.exercise_id === question.exercise_id
        );
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .list-wrapper {
    position: relative;
  }

  .question-list {
    padding: 0;
    margin-top: 0;
    margin-left: 40px;
    list-style: none;
  }

  .question-title {
    margin-top: 8px;
    text-align: center;
  }

  .list-labels {
    position: absolute;
    top: 0;
    left: 0;
    margin-top: 0;
    font-weight: bold;

    li {
      padding: 8px;
    }
  }

  .fade-numbers-enter-active {
    transition: opacity $core-time;
  }

  .fade-numbers-enter {
    opacity: 0;
  }

</style>
