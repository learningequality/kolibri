<template>

  <KGrid>
    <KGridItem
      :layout8="{ span: 4 }"
      :layout12="{ span: 5 }"
      class="list-wrapper"
    >
      <DragContainer
        v-if="fixedOrder && !readOnly"
        :items="annotatedQuestions"
        @sort="handleUserSort"
      >
        <transition-group tag="ol" name="list" class="question-list">
          <Draggable
            v-for="(question, questionIndex) in annotatedQuestions"
            :key="listKey(question)"
          >
            <DragHandle>
              <AssessmentQuestionListItem
                :draggable="true"
                :isSelected="isSelected(question)"
                :exerciseName="question.title"
                :isCoachContent="Boolean(numCoachContents(question.exercise_id))"
                :questionNumberOfExercise="question.counterInExercise"
                :isFirst="questionIndex === 0"
                :isLast="questionIndex === annotatedQuestions.length - 1"
                @select="currentQuestionIndex = questionIndex"
                @moveDown="moveQuestionDown(questionIndex)"
                @moveUp="moveQuestionUp(questionIndex)"
              />
            </DragHandle>
          </Draggable>
        </transition-group>
      </DragContainer>
      <ul v-else class="question-list">
        <AssessmentQuestionListItem
          v-for="(question, questionIndex) in annotatedQuestions"
          :key="listKey(question)"
          :draggable="false"
          :isSelected="isSelected(question)"
          :exerciseName="question.title"
          :isCoachContent="Boolean(numCoachContents(question.exercise_id))"
          :questionNumberOfExercise="question.counterInExercise"
          @select="currentQuestionIndex = questionIndex"
        />
      </ul>

      <transition name="fade-numbers">
        <ol v-if="fixedOrder" class="list-labels" aria-hidden>
          <li
            v-for="(question, questionIndex) in selectedQuestions"
            :key="questionIndex"
          ></li>
        </ol>
        <ul v-else class="list-labels" aria-hidden>
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
      <h3 class="question-title">
        {{ currentQuestion.title }}
      </h3>
      <KContentRenderer
        v-if="content && questionId"
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
    </KGridItem>
  </KGrid>

</template>


<script>

  import DragContainer from 'kolibri.coreVue.components.DragContainer';
  import Draggable from 'kolibri.coreVue.components.Draggable';
  import DragHandle from 'kolibri.coreVue.components.DragHandle';
  import AssessmentQuestionListItem from './AssessmentQuestionListItem';

  export default {
    name: 'QuestionListPreview',
    components: {
      AssessmentQuestionListItem,
      Draggable,
      DragContainer,
      DragHandle,
    },
    props: {
      // If set to true, question buttons will be draggable
      fixedOrder: {
        type: Boolean,
        required: true,
      },
      // If set to true, controls will be disabled for fixed-order mode
      readOnly: {
        type: Boolean,
        default: false,
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
    },
    methods: {
      handleUserSort({ newArray, newIndex, oldIndex }) {
        this.$store.commit('examCreation/SET_SELECTED_QUESTIONS', newArray);
        if (this.isSelected(this.selectedQuestions[oldIndex])) {
          // switch immediately
          this.currentQuestionIndex = newIndex;
        } else {
          // wait for the bounce animation to complete before switching
          setTimeout(() => {
            this.currentQuestionIndex = newIndex;
          }, 250);
        }
      },
      shiftOne(oldIndex, newIndex) {
        const newArray = [...this.selectedQuestions];
        newArray[oldIndex] = this.selectedQuestions[newIndex];
        newArray[newIndex] = this.selectedQuestions[oldIndex];
        this.handleUserSort({ newArray, oldIndex, newIndex });
      },
      moveQuestionUp(index) {
        this.shiftOne(index, index - 1);
      },
      moveQuestionDown(index) {
        this.shiftOne(index, index + 1);
      },
      listKey(question) {
        return question.exercise_id + question.question_id;
      },
      numCoachContents(exerciseId) {
        return this.selectedExercises[exerciseId].num_coach_contents;
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

  @import '~kolibri.styles.definitions';

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
