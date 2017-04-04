<template>

  <div>
    <h1>{{ `${$tr('createNewExam')} ${currentChannel.name}` }}</h1>
    <textbox
      :label="$tr('title')"
      :ariaLabel="$tr('title')"
      :placeholder="$tr('enterTitle')"
      :autofocus="true"
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
      <div><span v-for="item in breadcrumbs" class="breadcrumb-item">{{ item.title }}</span></div>

      <div>
        <table>
          <thead>
            <tr>
              <th class="col-icon"></th>
              <th class="col-title">{{ $tr('title') }}</th>
              <th class="col-add"></th>
            </tr>
          </thead>
          <tbody v-if="!fetching">
            <topic-row
              v-for="topic in subtopics"
              :topicId="topic.id"
              :topicTitle="topic.title"
              @enterTopic="handleEnterTopic"
              @addTopicExercises="handleAddTopicExercises"/>
            <exercise-row
              v-for="exercise in exercises"
              :exerciseId="exercise.id"
              :exerciseTitle="exercise.title"
              @addExercise="handleAddExercise"/>
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
      <icon-button :text="$tr('finish')" :primary="true" @click="finish"/>
    </div>

  </div>

</template>


<script>

  const ExamActions = require('../../state/actions/exam');

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
    },
    data() {
      return {
        selectedChannel: '',
        inputTitle: '',
        inputNumQuestions: '',
        validateTitle: false,
        validateNum: false,
        searchInput: '',
      };
    },
    components: {
      'ui-select': require('keen-ui/src/UiSelect'),
      'icon-button': require('kolibri.coreVue.components.iconButton'),
      'textbox': require('kolibri.coreVue.components.textbox'),
      'topic-row': require('./topic-row'),
      'exercise-row': require('./exercise-row'),
    },
    computed: {
      titleInvalid() {
        return this.validateTitle ? !this.inputTitle : false;
      },
      numQuestionsInvalid() {
        return this.validateNum ?
          (this.inputNumQuestions < 1) || (this.inputNumQuestions > 50) : false;
      },
      exercises() {
        return this.contents;
      },
    },
    methods: {
      handleEnterTopic(topicId) {
        this.fetchContent(this.currentChannel.id, topicId);
      },
      handleAddTopicExercises(topicId) {
        console.log('handleAddTopicExercises', topicId);
      },
      handleAddExercise(exerciseId) {
        console.log('handleAddExercise', exerciseId);
      },
      preview() {
        console.log('preview');
      },
      finish() {
        console.log('finish');
      },
    },
    vuex: {
      getters: {
        currentClass: state => state.pageState.currentClass,
        currentChannel: state => state.pageState.currentChannel,
        subtopics: state => state.pageState.subtopics,
        contents: state => state.pageState.contents,
        breadcrumbs: state => state.pageState.topic.breadcrumbs,
        fetching: state => state.pageState.fetching,
      },
      actions: {
        fetchContent: ExamActions.fetchContent,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .footer
    text-align: center
    button
      margin: auto
      margin-bottom: 1em

  .breadcrumb-item::after
    content: '>'

</style>
