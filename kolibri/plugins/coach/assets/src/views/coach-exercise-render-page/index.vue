<template>

  <immersive-full-screen :backPageLink="backPageLink">
    <template slot="text"> Figure out with designers what this is supposed to say </template>
    <template slot="body">
      <div class="page-status-container">
        <page-status
          :contentName="exercise.title"
          :userName="userName"
          :progress="exercise.progress_fraction"
          :assessment="assessment"
          :date="date"/>
      </div>
      <div class="outer-container">
        <div class="answer-history-container column">
          <answer-history/>
        </div>
        <div class="exercise-container column">
          <!--need to fix this-->
          <question-attempt
            :questionNumber="1"/>
          <content-renderer
            class="content-renderer"
            :id="exercise.content_id"
            :itemId="attemptLogs[0].item"
            :allowHints="false"
            :kind="exercise.kind"
            :files="exercise.files"
            :contentId="exercise.content_id"
            :channelId="channelId"
            :available="exercise.available"
            :answerState="answerState(attemptLogs[0])"
            :extraFields="exercise.extra_fields"/>
        </div>
      </div>
    </template>
  </immersive-full-screen>

</template>


<script>

  const constants = require('../../constants');

  module.exports = {
    $trNameSpace: 'coachExerciseRenderPage',
    $trs: {
      backto: 'Back to { text }',
    },
    components: {
      'immersive-full-screen': require('kolibri.coreVue.components.immersiveFullScreen'),
      'content-renderer': require('kolibri.coreVue.components.contentRenderer'),
      'page-status': require('./page-status'),
      'answer-history': require('./answer-history'),
      'question-attempt': require('./question-attempt'),
    },
    computed: {
      backPageLink() {
        return { name: constants.PageNames.CLASS_LIST };
      },
      assessment() {
        return 'Number completed, can calc from progress';
      },
      date() {
        return 'Date (check with designers)';
      },
    },
    methods: {
      answerState(attemptLog) {
        return JSON.parse(JSON.parse(attemptLog.answer));
      },
      backtoText(text) {
        return this.$tr('backto', { text });
      },
    },
    vuex: {
      getters: {
        // pageState: state => state.pageState,
        channelId: state => state.pageState.channelId,
        attemptLogs: state => state.pageState.attemptLogs,
        exercise: state => state.pageState.exercise,
        userName: state => state.core.session.username,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .column
    float: left

  .page-status-container
    padding-top: 20px
    padding-left: 10px
    padding-right: 10px

  .outer-container
    display: table-cell
    height: 100%
    width: 1%
    padding: 10px

  .answer-history-container
    width: 30%
    height: 100%
    overflow-y: auto

  .exercise-container
    width: 70%

</style>
