<template>

  <div id="page-status">
    <h1>{{ $tr('header') }}</h1>
  </div>

</template>


<script>

  module.exports = {
    $trNameSpace: 'CoachExercisePageStatus',
    $trs: {
      header: 'Page Status',
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

  #page-status
    background-color: grey

</style>
