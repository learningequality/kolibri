<template>

  <div>
    <h1>{{ $tr('createNewExam') }}</h1>
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

    <div v-if="channelExercises">
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
        breadcrumbs
        topic list
      </div>
    </div>
  </div>

</template>


<script>

  const ExamActions = require('../../state/actions/exam');

  module.exports = {
    $trNameSpace: 'createExamPage',
    $trs: {
      createNewExam: 'Create a new exam',
      title: 'Title',
      enterTitle: 'Enter a title',
      numQuestions: 'Number of questions',
      enterNum: 'Enter a number',
      examRequiresTitle: 'The exam requires a title',
      examRequiresNum: 'The exam requires a number of questions between 1 and 50',
      searchContent: 'Search for content within channel',
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
    },
    computed: {

      titleInvalid() {
        return this.validateTitle ? !this.inputTitle : false;
      },
      numQuestionsInvalid() {
        return this.validateNum ?
          (this.inputNumQuestions < 1) || (this.inputNumQuestions > 50) : false;
      },
    },
    vuex: {
      getters: {
        channelExercises: state => [],
      },
      actions: {
        getChannelExercises: ExamActions.getChannelExercises,

      },
    },
  };

</script>


<style lang="stylus" scoped></style>
