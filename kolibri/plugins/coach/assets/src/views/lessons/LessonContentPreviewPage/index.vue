<template>

  <div>
    Lesson Content Preview Page
    <attempt-log-list
      :attemptLogs="questions"
      :selectedQuestionNumber="0"
    />
    <content-renderer
      class="content-renderer"
      :id="exercise.pk"
      :itemId="questions[0]"
      :allowHints="false"
      :kind="exercise.kind"
      :files="exercise.files"
      :contentId="exercise.content_id"
      :channelId="exercise.channel_id"
      :available="exercise.available"
      :extraFields="exercise.extra_fields"
      :interactive="false"
      :assessment="true"
    />
  </div>

</template>


<script>

  import contentRenderer from 'kolibri.coreVue.components.contentRenderer';
  import attemptLogList from '../../attempt-log-list';
  export default {
    components: {
      contentRenderer,
      attemptLogList,
    },
    computed: {},
    methods: {},
    vuex: {
      getters: {
        exercise: state => state.pageState.currentContentNode,
        questions: state => state.pageState.questions,
      },
      actions: {},
    },
    $trs: {},
  };

</script>


<style lang="stylus" scoped></style>
