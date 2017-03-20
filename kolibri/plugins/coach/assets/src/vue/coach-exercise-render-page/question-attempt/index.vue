<template>

  <div class="question-attempt">
    <h3>{{ $tr('header') }}</h3>
  </div>

</template>


<script>

  module.exports = {
    $trNameSpace: 'CoachExerciseQuestionAttempt',
    $trs: {
      header: 'Question attempt',
    },
    // components: {
    //   'content-renderer': require('kolibri.coreVue.components.contentRenderer'),
    //   'page-status': require('./page-status'),
    //   'answer-history': require('./answer-history'),
    //   'question-attempt': require('./question-attempt'),
    // },
    computed: {
      channelId() {
        return '78eed5c0b59b30c0a40c94c17c849af6';
      },
    },
    vuex: {
      getters: {
        pageState: state => state.pageState,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .question-attempt
    background-color: yellow

</style>
