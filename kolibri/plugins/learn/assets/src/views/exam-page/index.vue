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
        :extraFields="content.extra_fields"/>
    </div>
  </template>
</immersive-full-screen>

</template>


<script>

  module.exports = {
    $trNameSpace: 'examPage',
    $trs: {
      submitExam: 'Submit exam',
      backToExamList: 'Back to exam list',
      questionsAnswered: '{numRemain, number} of {numTotal, number}' +
        '{numTotal, plural, one {question} other {questions}} remaining',
    },
    components: {
      'immersive-full-screen': require('kolibri.coreVue.components.immersiveFullScreen'),
    },
    vuex: {
      getters: {
        examTitle: state => state.pageState.title,
        channelId: state => state.pageState.channelId
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
