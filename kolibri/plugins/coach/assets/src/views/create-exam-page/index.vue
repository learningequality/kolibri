<template>

  <div>
    <h1>{{ `${$tr('createNewExam')} ${currentChannel.name}` }}</h1>
    <textbox
      :label="$tr('title')"
      :ariaLabel="$tr('title')"
      :placeholder="$tr('enterTitle')"
      :autofocus="false"
      :invalid="titleInvalid"
      :error="$tr('examRequiresTitle')"
      v-model.trim="inputTitle"
      @blur="validateTitle = true"
      @input="validateTitle = true"
    />
    <textbox
      :label="$tr('numQuestions')"
      :ariaLabel="$tr('numQuestions')"
      :placeholder="$tr('enterNum')"
      :invalid="numQuestionsInvalid"
      :error="$tr('examRequiresNum')"
      type="number"
      v-model.trim="inputNumQuestions"
      @blur="validateNum = true"
      @input="validateNum = true"
    />

    <h2>Choose exercises</h2>
    <textbox
      :ariaLabel="$tr('searchContent')"
      :placeholder="$tr('searchContent')"
      v-model.trim="searchInput"
    />
    <div v-if="searchInput">
      search results
    </div>
    <div v-else>
      <nav>
        <ol>
          <li v-for="(topic, index) in topic.breadcrumbs" :class="[notLastBreadcrumb(index) ? 'not-last' : '']">
            <button v-if="notLastBreadcrumb(index)" @click="handleGoToTopic(topic.id)">{{ topic.title }}</button>
            <strong v-else>{{ topic.title }}</strong>
          </li>
        </ol>
      </nav>

      <div>
        <table>
          <thead>
            <tr>
              <th class="col-icon"></th>
              <th class="col-title">{{ $tr('title') }}</th>
              <th class="col-add"></th>
            </tr>
          </thead>
          <tbody v-if="!loading">
            <exercise-row
              v-for="exercise in exercises"
              :exerciseId="exercise.id"
              :exerciseTitle="exercise.title"
              :selectedExercises="selectedExercises"
              @addExercise="handleAddExercise"
              @removeExercise="handleRemoveExercise"/>
            <topic-row
              v-for="topic in subtopics"
              :topicId="topic.id"
              :topicTitle="topic.title"
              :allExercisesWithinTopic="topic.allExercisesWithinTopic"
              :selectedExercises="selectedExercises"
              @goToTopic="handleGoToTopic"
              @addTopicExercises="handleAddTopicExercises"
              @removeTopicExercises="handleRemoveTopicExercises"/>
            <p v-if="(subtopics.length === 0) && (exercises.length === 0)">No exercises within this topic.</p>
          </tbody>
          <tbody v-else>
            LOADING...
          </tbody>
        </table>
      </div>
    </div>

    <div class="footer">
      <p>7 Exercises selected</p>
      <icon-button :text="$tr('preview')" @click="preview">
        <mat-svg category="action" name="visibility"/>
      </icon-button>
      <br>
      <icon-button :text="$tr('finish')" :primary="true" @click="createExam(currentClass.id, currentChannel.id, selectedExercises, seed)"/>
    </div>

    <preview-new-exam-modal
      v-if="showPreviewNewExamModal"
      :examTitle="inputTitle"
      :examNumQuestions="Number(inputNumQuestions)"
      :selectedExercises="selectedExercises"/>

    <ui-snackbar-container
      class="snackbar-container"
      ref="snackbarContainer"
      position="center"/>
  </div>

</template>


<script>

  const ExamActions = require('../../state/actions/exam');
  const ExamModals = require('../../examConstants').Modals;

  module.exports = {
    $trNameSpace: 'createExamPage',
    $trs: {
      createNewExam: 'Create a new exam from',
      title: 'Title',
      enterTitle: 'Enter a title',
      numQuestions: 'Number of questions',
      enterNum: 'Enter a number',
      examRequiresTitle: 'The exam requires a title',
      examRequiresNum: 'The exam requires a number of questions between 1 and 50',
      searchContent: 'Search for content within channel',
      preview: 'Preview',
      finish: 'Finish',
      added: 'Added',
      removed: 'Removed',
      alreadyAdded: 'Already added',
      undo: 'Undo',
    },
    data() {
      return {
        selectedChannel: '',
        inputTitle: '',
        inputNumQuestions: '',
        validateTitle: false,
        validateNum: false,
        searchInput: '',
        loading: false,
        topicsSelected: [],
        seed: '',
      };
    },
    components: {
      'ui-select': require('keen-ui/src/UiSelect'),
      'ui-snackbar': require('keen-ui/src/UiSnackbar'),
      'ui-snackbar-container': require('keen-ui/src/UiSnackbarContainer'),
      'icon-button': require('kolibri.coreVue.components.iconButton'),
      'textbox': require('kolibri.coreVue.components.textbox'),
      'topic-row': require('./topic-row'),
      'exercise-row': require('./exercise-row'),
      'preview-new-exam-modal': require('./preview-new-exam-modal'),
    },
    computed: {
      titleInvalid() {
        return this.validateTitle ? !this.inputTitle : false;
      },
      numQuestionsInvalid() {
        return this.validateNum ?
          (this.inputNumQuestions < 1) || (this.inputNumQuestions > 50) : false;
      },
      showPreviewNewExamModal() {
        return this.modalShown === ExamModals.PREVIEW_NEW_EXAM;
      },
    },
    methods: {
      handleGoToTopic(topicId) {
        this.loading = true;
        this.fetchContent(this.currentChannel.id, topicId).then(
          () => {
            this.loading = false;
          },
          error => {}
        );
      },
      handleAddExercise(exerciseId, exerciseTitle) {
        this.addExercise(exerciseId);
        this.$refs.snackbarContainer.createSnackbar({ message: `${this.$tr('added')} ${exerciseTitle}` });
      },
      handleRemoveExercise(exerciseId, exerciseTitle) {
        this.removeExercise(exerciseId);
        this.$refs.snackbarContainer.createSnackbar({ message: `${this.$tr('removed')} ${exerciseTitle}` });
      },
      handleAddTopicExercises(allExercisesWithinTopic, topicTitle) {
        allExercisesWithinTopic.forEach(exerciseId => this.addExercise(exerciseId));
        this.$refs.snackbarContainer.createSnackbar({ message: `${this.$tr('added')} ${topicTitle}` });
      },
      handleRemoveTopicExercises(allExercisesWithinTopic, topicTitle) {
        allExercisesWithinTopic.forEach(exerciseId => this.removeExercise(exerciseId));
        this.$refs.snackbarContainer.createSnackbar({ message: `${this.$tr('removed')} ${topicTitle}` });
      },
      preview() {
        this.displayModal(ExamModals.PREVIEW_NEW_EXAM);
      },
      notLastBreadcrumb(index) {
        return index !== this.topic.breadcrumbs.length - 1;
      },
    },
    vuex: {
      getters: {
        currentClass: state => state.pageState.currentClass,
        currentChannel: state => state.pageState.currentChannel,
        topic: state => state.pageState.topic,
        subtopics: state => state.pageState.subtopics,
        exercises: state => state.pageState.exercises,
        selectedExercises: state => state.pageState.selectedExercises,
        modalShown: state => state.pageState.modalShown,
      },
      actions: {
        fetchContent: ExamActions.fetchContent,
        createExam: ExamActions.createExam,
        addExercise: ExamActions.addExercise,
        removeExercise: ExamActions.removeExercise,
        displayModal: ExamActions.displayModal,
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

</style>
