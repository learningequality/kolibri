<template>

  <tr>
    <td class="col-icon">
      <content-icon :kind="topic"/>
    </td>
    <td class="col-title">
      <span @click="enterTopic">{{ topicTitle }}</span>
    </td>
    <td class="col-add">
      <icon-button :text="$tr('exercises')" @click="addTopicExercises">
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
    methods: {
      enterTopic() {
        console.log('enter topic');
      },
      addTopicExercises() {
        console.log('addTopicExercises');
      },
    },
  };

</script>


<style lang="stylus" scoped></style>

