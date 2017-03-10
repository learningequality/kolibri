<template>

  <div id="page-status">
    <div class="column pure-u-3-4">
      <h1>{{ userName }}</h1>
      <div id="class-name">
        <content-icon :kind="exerciseKind"/>
      </div>
      {{ className }}
      <div id="assessment">
        <progress-icon :progress="progress"/>
        {{ assessment }} {{ $tr('assessment') }}
      </div>
    </div>
    <div class="column pure-u-1-4">
      <div id="inner-column">
        <progress-icon :progress="progress"/>
        <strong> {{ $tr('mastered') }} </strong>
        <br>
        {{ date }}
      </div>
    </div>
  </div>

</template>


<script>

  const constants = require('kolibri.coreVue.vuex.constants');

  module.exports = {
    $trNameSpace: 'CoachExercisePageStatus',
    $trs: {
      assessment: 'questions in a row correct - Today',
      mastered: 'Mastered',
    },
    components: {
      'content-icon': require('kolibri.coreVue.components.contentIcon'),
      'progress-icon': require('kolibri.coreVue.components.progressIcon'),
    },
    props: {
      className: {
        type: String,
        required: true,
      },
      userName: {
        type: String,
        required: true,
      },
      progress: {
        type: Number,
        default: '',
      },
      assessment: {
        type: String,
        default: '',
      },
      date: {
        type: String,
        default: false,
      },
    },
    computed: {
      channelId() {
        return '78eed5c0b59b30c0a40c94c17c849af6';
      },
      exerciseKind() {
        return constants.ContentNodeKinds.EXERCISE;
      }
    },
    vuex: {
      getters: {
        pageState: state => state.pageState,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  #page-status
    background-color: $core-bg-light

  .column
    float: left

  #inner-column
    float: right

  #class-name
    float: left

</style>
