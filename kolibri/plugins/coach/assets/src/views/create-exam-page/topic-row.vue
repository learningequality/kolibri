<template>

  <tr>
    <td class="col-icon">
      <content-icon :kind="topic"/>
    </td>
    <td class="col-title">
      <button class="title" @click="$emit('goToTopic', topicId)">{{ topicTitle }}</button>
    </td>
    <td class="col-add">
      <icon-button :text="$tr('exercises')" :primary="true" @click="$emit('addTopicExercises', topicId, topicTitle)">
        <mat-svg category="content" name="add"/>
      </icon-button>
    </td>
  </tr>

</template>


<script>

  const ContentNodeKinds = require('kolibri.coreVue.vuex.constants').ContentNodeKinds;

  module.exports = {
    $trNameSpace: 'topicRow',
    $trs: {
      exercises: 'Exercises',
    },
    components: {
      'content-icon': require('kolibri.coreVue.components.contentIcon'),
      'icon-button': require('kolibri.coreVue.components.iconButton'),
    },
    props: {
      topicId: {
        type: String,
        requires: true,
      },
      topicTitle: {
        type: String,
        required: true,
      },
    },
    computed: {
      topic() {
        return ContentNodeKinds.TOPIC;
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .title
    padding: 0
    border: none
    font-size: 1em

</style>

