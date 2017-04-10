<template>

  <immersive-full-screen :backPageLink="backPageLink">
    <template slot="text"> {{ backtoText(contentName) }} </template>
    <template slot="body">
      <div class="page-status-container">
        <page-status
          :userName="userName"
          :score="score"
          :questions="questions"
          :date="date"/>
      </div>
      <div class="outer-container">
        <div class="answer-history-container column">
          <answer-history/>
        </div>
        <div class="exercise-container column">
          <div class="fake" style="height:600px;background-color:pink;"></div>
        </div>
      </div>
    </template>
  </immersive-full-screen>

</template>


<script>

  const constants = require('../../constants');

  module.exports = {
    $trNameSpace: 'coachExamRenderPage',
    $trs: {
      backto: 'Back to { text }',
    },
    components: {
      'immersive-full-screen': require('kolibri.coreVue.components.immersiveFullScreen'),
      'page-status': require('./page-status'),
      'answer-history': require('./answer-history'),
    },
    computed: {
      backPageLink() {
        return { name: constants.PageNames.EXAM_REPORT };
      },
    },
    methods: {
      backtoText(text) {
        return this.$tr('backto', { text });
      },
    },
    vuex: {
      getters: {
        pageState: state => state.pageState,
        // fake date for page-status
        contentName: () => 'Summative Exam Report',
        userName: () => 'Aaron Andrews',
        score: () => 72,
        questions: () => [{ correct: 0 }, { correct: 1 }],
        date: () => '18 Nov 2016',
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
