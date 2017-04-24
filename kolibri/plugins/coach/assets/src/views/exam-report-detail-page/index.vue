<template>

  <immersive-full-screen :backPageLink="backPageLink" :backPageText="backtoText(contentName)">
    <template>
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
      content() {
        return {
          id: '84658d43b99f5824bc1aa5e3eb6b3578',
          kind: 'exercise',
          files: [{
            extension: 'perseus',
            download_url: '/downloadcontent/898fa0875f5cdf1721a32eb7540d0ec8.perseus/Divide_fractions_and_whole_numbers_word_problems_Exercise.perseus',
            available: true,
            checksum: '898fa0875f5cdf1721a32eb7540d0ec8',
            file_size: 182937,
            id: '47e59275f0f64c89aba65a537aeb38c2',
            lang: null,
            preset: 'Exercise',
            priority: null,
            storage_url: '/zipcontent/898fa0875f5cdf1721a32eb7540d0ec8.perseus/',
            supplementary: false,
            thumbnail: false,
          }],
          content_id: '357f3d15348c4e3d8ac5d459ad8b924d',
          available: true,
          extraFields: null,
        };
      },
      channelId() {
        return '78eed5c0b59b30c0a40c94c17c849af6';
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
