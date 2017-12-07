<template>

  <div>
    <h1>{{ $tr('createNewExam', { channelName: currentChannel.name }) }}</h1>
    <div class="pure-g">
      <div :class="windowSize.breakpoint > 3 ? 'pure-u-1-2' : 'pure-u-1-1'">
        <k-textbox
          ref="title"
          :label="$tr('title')"
          :autofocus="true"
          :invalid="titleIsInvalid"
          :invalidText="titleIsInvalidText"
          @blur="titleBlurred = true"
          v-model.trim="inputTitle"
        />
      </div>
      <div :class="windowSize.breakpoint > 3 ? 'pure-u-1-2' : 'pure-u-1-1'">
        <k-textbox
          ref="numQuest"
          type="number"
          :label="$tr('numQuestions')"
          :invalid="numQuestIsInvalid"
          :invalidText="numQuestIsInvalidText"
          @blur="numQuestBlurred = true"
          v-model.trim.number="inputNumQuestions"
        />
      </div>
    </div>

    <h2>{{ $tr('chooseExercises') }}</h2>
    <!--<k-textbox-->
      <!--v-model.trim="searchInput"-->
    <!--/>-->
    <!--<div v-if="searchInput">-->
      <!--search results-->
    <!--</div>-->
    <div>
      <nav>
        <ol>
          <li v-for="(topic, index) in topic.breadcrumbs" :key="index" :class="breadCrumbClass(index)">
            <button v-if="notLastBreadcrumb(index)" @click="handleGoToTopic(topic.id)">{{ topic.title }}</button>
            <strong v-else>{{ topic.title }}</strong>
          </li>
        </ol>
      </nav>

      <div>
        <transition name="fade" mode="out-in">
          <ui-progress-linear v-if="loading" key="progress" />

          <table v-else key="table">
            <thead>
              <tr>
                <th class="col-checkbox">
                  <k-checkbox
                    :label="$tr('selectAll')"
                    :showLabel="false"
                    :checked="allExercisesWithinCurrentTopicSelected"
                    :indeterminate="someExercisesWithinCurrentTopicSelected"
                    @change="changeSelection"
                  />
                </th>
                <th class="col-title">{{ $tr('name') }}</th>
                <th class="col-selection"></th>
              </tr>
            </thead>
            <tbody>
              <exercise-row
                v-for="exercise in exercises"
                :key="exercise.id"
                :exerciseId="exercise.id"
                :exerciseTitle="exercise.title"
                :exerciseNumAssessments="exercise.numAssessments"
                :selectedExercises="selectedExercises"
                @addExercise="handleAddExercise"
                @removeExercise="handleRemoveExercise"
              />
              <topic-row
                v-for="topic in subtopics"
                :key="topic.id"
                :topicId="topic.id"
                :topicTitle="topic.title"
                :allExercisesWithinTopic="topic.allExercisesWithinTopic"
                :selectedExercises="selectedExercises"
                @goToTopic="handleGoToTopic"
                @addTopicExercises="handleAddTopicExercises"
                @removeTopicExercises="handleRemoveTopicExercises"
              />
            </tbody>
          </table>
        </transition>
      </div>
    </div>

    <div class="footer">
      <p>{{ $tr('selected', { count: selectedExercises.length }) }}</p>

      <ui-alert
        v-if="formIsInvalid"
        type="error"
        :dismissible="false"
      >
        {{ formIsInvalidText }}
      </ui-alert>

      <k-button :text="$tr('preview')" @click="preview" />

      <br>
      <k-button :text="$tr('finish')" :primary="true" @click="finish" :disabled="submitting" />
    </div>

    <preview-new-exam-modal
      v-if="showPreviewNewExamModal"
      :examChannelId="currentChannel.id"
      :examQuestionSources="questionSources"
      :examSeed="seed"
      :examNumQuestions="inputNumQuestions"
      @randomize="seed = generateRandomSeed()"
    />

    <core-snackbar
      v-if="examModificationSnackbarIsVisible"
      :key="snackbarText"
      :text="snackbarText"
      :autoDismiss="true"
    />
  </div>

</template>


<script>

  import topicRow from './topic-row';
  import exerciseRow from './exercise-row';
  import previewNewExamModal from './preview-new-exam-modal';
  import {
    fetchContent,
    createExam,
    addExercise,
    removeExercise,
    displayExamModal,
    showExamModificationSnackbar,
  } from '../../state/actions/exam';
  import { className } from '../../state/getters/main';
  import { Modals as ExamModals, EXAM_MODIFICATION_SNACKBAR } from '../../examConstants';
  import { CollectionKinds } from 'kolibri.coreVue.vuex.constants';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kCheckbox from 'kolibri.coreVue.components.kCheckbox';
  import kTextbox from 'kolibri.coreVue.components.kTextbox';
  import coreSnackbar from 'kolibri.coreVue.components.coreSnackbar';
  import uiProgressLinear from 'keen-ui/src/UiProgressLinear';
  import uiAlert from 'kolibri.coreVue.components.uiAlert';
  import shuffle from 'lodash/shuffle';
  import random from 'lodash/random';
  import { currentSnackbar } from 'kolibri.coreVue.vuex.getters';

  export default {
    name: 'createExamPage',
    components: {
      coreSnackbar,
      uiProgressLinear,
      kButton,
      kTextbox,
      topicRow,
      exerciseRow,
      previewNewExamModal,
      kCheckbox,
      uiAlert,
    },
    mixins: [responsiveWindow],
    $trs: {
      createNewExam: 'Create a new exam from {channelName}',
      chooseExercises: 'Select exercises to pull questions from',
      selectAll: 'Select all',
      title: 'Exam title',
      numQuestions: 'Number of questions',
      examRequiresTitle: 'The exam requires a title',
      numQuestionsBetween: 'The exam requires a number of questions between 1 and 50',
      numQuestionsExceed:
        'The max number of questions based on the exercises you selected is {maxQuestionsFromSelection}. Select more exercises to reach {inputNumQuestions} questions, or lower the number of questions to {maxQuestionsFromSelection}.',
      noneSelected: 'No exercises are selected',
      searchContent: 'Search for content within channel',
      preview: 'Preview',
      finish: 'Finish',
      added: 'Added',
      removed: 'Removed',
      selected: '{count, number, integer} {count, plural, one {Exercise} other {Exercises}} selected',
      duplicateTitle: 'An exam with that title already exists',
      name: 'Name',
    },
    data() {
      return {
        selectedChannel: '',
        inputTitle: '',
        inputNumQuestions: '',
        titleBlurred: false,
        numQuestBlurred: false,
        selectionMade: false,
        searchInput: '',
        loading: false,
        seed: this.generateRandomSeed(),
        selectAll: false,
        previewOrSubmissionAttempt: false,
        submitting: false,
        snackbarText: null,
      };
    },
    computed: {
      duplicateTitle() {
        const index = this.exams.findIndex(
          exam => exam.title.toUpperCase() === this.inputTitle.toUpperCase()
        );
        if (index === -1) {
          return false;
        }
        return true;
      },
      titleIsInvalidText() {
        if (this.titleBlurred || this.previewOrSubmissionAttempt) {
          if (this.inputTitle === '') {
            return this.$tr('examRequiresTitle');
          }
          if (this.duplicateTitle) {
            return this.$tr('duplicateTitle');
          }
        }
        return '';
      },
      titleIsInvalid() {
        return !!this.titleIsInvalidText;
      },
      maxQuestionsFromSelection() {
        // in case numAssestments is null, return 0
        return this.selectedExercises.reduce(
          (sum, exercise) => sum + (exercise.numAssessments || 0),
          0
        );
      },
      numQuestExceedsSelection() {
        return this.inputNumQuestions > this.maxQuestionsFromSelection;
      },
      exercisesAreSelected() {
        return this.selectedExercises.length > 0;
      },
      numQuestIsInvalidText() {
        if (this.numQuestBlurred || this.previewOrSubmissionAttempt) {
          if (this.inputNumQuestions === '') {
            return this.$tr('numQuestionsBetween');
          }
          if (this.inputNumQuestions < 1 || this.inputNumQuestions > 50) {
            return this.$tr('numQuestionsBetween');
          }
          if (this.exercisesAreSelected && this.numQuestExceedsSelection) {
            return this.$tr('numQuestionsExceed', {
              inputNumQuestions: this.inputNumQuestions,
              maxQuestionsFromSelection: this.maxQuestionsFromSelection,
            });
          }
        }
        return '';
      },
      numQuestIsInvalid() {
        return !!this.numQuestIsInvalidText;
      },
      selectionIsInvalidText() {
        if (this.selectionMade || this.previewOrSubmissionAttempt) {
          if (!this.exercisesAreSelected) {
            return this.$tr('noneSelected');
          }
        }
        return '';
      },
      selectionIsInvalid() {
        return !!this.selectionIsInvalidText;
      },
      formIsInvalidText() {
        if (this.titleIsInvalid) {
          return this.titleIsInvalidText;
        }
        if (this.numQuestIsInvalid) {
          return this.numQuestIsInvalidText;
        }
        if (this.selectionIsInvalid) {
          return this.selectionIsInvalidText;
        }
        return '';
      },
      formIsInvalid() {
        return !!this.formIsInvalidText;
      },
      allExercisesWithinCurrentTopic() {
        let allExercises = [];
        this.subtopics.forEach(subtopic => {
          allExercises = allExercises.concat(subtopic.allExercisesWithinTopic);
        });
        this.exercises.forEach(exercise => {
          allExercises.push(exercise);
        });
        return allExercises;
      },
      allExercisesWithinCurrentTopicSelected() {
        if (this.allExercisesWithinCurrentTopic.length === 0) {
          return false;
        }
        return this.allExercisesWithinCurrentTopic.every(exercise =>
          this.selectedExercises.some(selectedExercise => selectedExercise.id === exercise.id)
        );
      },
      noExercisesWithinCurrentTopicSelected() {
        return this.allExercisesWithinCurrentTopic.every(
          exercise =>
            !this.selectedExercises.some(selectedExercise => selectedExercise.id === exercise.id)
        );
      },
      someExercisesWithinCurrentTopicSelected() {
        return (
          !this.allExercisesWithinCurrentTopicSelected && !this.noExercisesWithinCurrentTopicSelected
        );
      },
      showPreviewNewExamModal() {
        return this.examModalShown === ExamModals.PREVIEW_NEW_EXAM;
      },
      questionSources() {
        const shuffledExercises = shuffle(Array.from(this.selectedExercises));
        const numExercises = shuffledExercises.length;
        const numQuestions = this.inputNumQuestions;
        const questionsPerExercise = numQuestions / numExercises;
        const remainingQuestions = numQuestions % numExercises;
        if (remainingQuestions === 0) {
          return shuffledExercises.map(exercise => ({
            exercise_id: exercise.id,
            number_of_questions: Math.trunc(questionsPerExercise),
          }));
        } else if (questionsPerExercise >= 1) {
          return shuffledExercises.map((exercise, index) => {
            if (index < remainingQuestions) {
              return {
                exercise_id: exercise.id,
                number_of_questions: Math.trunc(questionsPerExercise) + 1,
              };
            }
            return {
              exercise_id: exercise.id,
              number_of_questions: Math.trunc(questionsPerExercise),
            };
          });
        }
        const exercisesSubset = shuffledExercises;
        exercisesSubset.splice(numQuestions);
        return exercisesSubset.map(exercise => ({
          exercise_id: exercise.id,
          number_of_questions: 1,
        }));
      },
      examModificationSnackbarIsVisible() {
        return this.currentSnackbar === EXAM_MODIFICATION_SNACKBAR;
      },
    },
    methods: {
      changeSelection() {
        this.selectionMade = true;
        const allExercises = this.allExercisesWithinCurrentTopic;
        const currentTopicTitle = this.topic.title;
        if (this.allExercisesWithinCurrentTopicSelected) {
          this.handleRemoveTopicExercises(allExercises, currentTopicTitle);
        } else {
          this.handleAddTopicExercises(allExercises, currentTopicTitle);
        }
      },
      handleGoToTopic(topicId) {
        this.loading = true;
        this.fetchContent(topicId).then(() => {
          this.loading = false;
        });
      },
      handleAddExercise(exercise) {
        this.selectionMade = true;
        this.addExercise(exercise);
        this.snackbarText = `${this.$tr('added')} ${exercise.title}`;
        this.showExamModificationSnackbar();
      },
      handleRemoveExercise(exercise) {
        this.removeExercise(exercise);
        this.snackbarText = `${this.$tr('removed')} ${exercise.title}`;
        this.showExamModificationSnackbar();
      },
      handleAddTopicExercises(allExercisesWithinTopic, topicTitle) {
        this.selectionMade = true;
        allExercisesWithinTopic.forEach(exercise => this.addExercise(exercise));
        this.snackbarText = `${this.$tr('added')} ${topicTitle}`;
        this.showExamModificationSnackbar();
      },
      handleRemoveTopicExercises(allExercisesWithinTopic, topicTitle) {
        allExercisesWithinTopic.forEach(exercise => this.removeExercise(exercise));
        this.snackbarText = `${this.$tr('removed')} ${topicTitle}`;
        this.showExamModificationSnackbar();
      },
      preview() {
        this.previewOrSubmissionAttempt = true;
        if (this.formIsInvalid) {
          this.focusOnInvalidField();
        } else {
          this.displayExamModal(ExamModals.PREVIEW_NEW_EXAM);
        }
      },
      finish() {
        this.previewOrSubmissionAttempt = true;
        if (this.formIsInvalid) {
          this.focusOnInvalidField();
        } else {
          this.submitting = true;
          const classCollection = {
            id: this.classId,
            name: this.className,
            kind: CollectionKinds.CLASSROOM,
          };
          const examObj = {
            classId: this.classId,
            channelId: this.currentChannel.id,
            title: this.inputTitle,
            numQuestions: this.inputNumQuestions,
            questionSources: this.questionSources,
            seed: this.seed,
          };
          this.createExam(classCollection, examObj);
        }
      },
      focusOnInvalidField() {
        if (this.titleIsInvalid) {
          this.$refs.title.focus();
        } else if (this.numQuestIsInvalid) {
          this.$refs.numQuest.focus();
        }
      },
      notLastBreadcrumb(index) {
        return index !== this.topic.breadcrumbs.length - 1;
      },
      breadCrumbClass(index) {
        if (this.notLastBreadcrumb(index)) {
          return 'not-last';
        }
        return '';
      },
      generateRandomSeed() {
        return random(1000);
      },
    },
    vuex: {
      getters: {
        classId: state => state.classId,
        className,
        currentChannel: state => state.pageState.currentChannel,
        topic: state => state.pageState.topic,
        subtopics: state => state.pageState.subtopics,
        exercises: state => state.pageState.exercises,
        selectedExercises: state => state.pageState.selectedExercises,
        examModalShown: state => state.pageState.examModalShown,
        exams: state => state.pageState.exams,
        currentSnackbar,
      },
      actions: {
        fetchContent,
        createExam,
        addExercise,
        removeExercise,
        displayExamModal,
        showExamModificationSnackbar,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .footer
    text-align: center

    button
      margin: auto
      margin-bottom: 1em

  ol
    padding: 0.5em

  li
    display: inline-block

    button
      vertical-align: baseline
      padding: 0
      border: none
      font-size: 1em


  .not-last
    &:after
      content: '/'
      padding-right: 0.5em
      padding-left: 0.5em

  .snackbar-container
    position: fixed
    bottom: 0
    z-index: 6

  .fade-enter-active, .fade-leave-active
    transition: opacity 0.1s

  .fade-enter, .fade-leave-to .fade-leave-active
    opacity: 0

  .validation-error
    color: $core-text-error

  table
    width: 100%

  .col-title
    text-align: left

  .col-checkbox
    width: 40px

</style>
