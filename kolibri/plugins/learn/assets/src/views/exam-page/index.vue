<template>

  <immersive-full-screen :backPageLink="backPageLink">
    <template slot="text"> {{ $tr('backToExamList') }} </template>
    <template slot="body">
      <div class="question-status-container">

      </div>
      <div class="question-container">
        <content-renderer
          class="content-renderer"
          :id="content.id"
          :kind="content.kind"
          :files="content.files"
          :contentId="content.content_id"
          :channelId="channelId"
          :available="content.available"
          :extraFields="content.extra_fields"
          :itemId="itemId"
          :allowHints="false"/>
        <icon-button @click="goToQuestion(questionNumber - 1)" :text="$tr('previousQuestion')"></icon-button>
        <icon-button @click="goToQuestion(questionNumber + 1)" :text="$tr('nextQuestion')"></icon-button>
      </div>
    </template>
  </immersive-full-screen>

</template>


<script>

  const PageNames = require('../../constants').PageNames;

  module.exports = {
    $trNameSpace: 'examPage',
    $trs: {
      submitExam: 'Submit exam',
      backToExamList: 'Back to exam list',
      questionsAnswered: '{numRemain, number} of {numTotal, number} {numTotal, plural, one {question} other {questions}} remaining',
      previousQuestion: 'Previous question',
      nextQuestion: 'Next question',
    },
    components: {
      'immersive-full-screen': require('kolibri.coreVue.components.immersiveFullScreen'),
      'content-renderer': require('kolibri.coreVue.components.contentRenderer'),
      'icon-button': require('kolibri.coreVue.components.iconButton'),
    },
    vuex: {
      getters: {
        exam: state => state.pageState.exam,
        channelId: state => state.pageState.channelId,
        content: state => state.pageState.content,
        itemId: state => state.pageState.itemId,
        questionNumber: state => state.pageState.questionNumber,
      },
    },
    methods: {
      goToQuestion(questionNumber) {
        this.$router.push({
          name: PageNames.EXAM,
          params: { channel_id: this.channelId, id: this.exam.id, questionNumber },
        });
      },
    },
    computed: {
      backPageLink() {
        return {
          name: PageNames.EXAM_LIST,
          params: { channel_id: this.channelId },
        };
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .question-status-container
    padding-top: 20px
    padding-left: 10px
    padding-right: 10px

  .questioj-container
    display: table-cell
    height: 100%
    width: 100%
    padding: 10px

</style>
