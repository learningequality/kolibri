<template>

  <tr>
    <td class="col-icon">
      <content-icon :kind="exercise"/>
    </td>
    <td class="col-title">
      <span>{{ exerciseTitle }}</span>
    </td>
    <td class="col-add">
      <icon-button :text="$tr('exercise')" :primary="true" @click="$emit('addExercise', exerciseId, exerciseTitle)">
        <mat-svg category="content" name="add"/>
      </icon-button>
    </td>
  </tr>

</template>


<script>

  const ContentNodeKinds = require('kolibri.coreVue.vuex.constants').ContentNodeKinds;

  module.exports = {
    $trNameSpace: 'exerciseRow',
    $trs: {
      exercise: 'Exercise',
    },
    components: {
      'content-icon': require('kolibri.coreVue.components.contentIcon'),
      'icon-button': require('kolibri.coreVue.components.iconButton'),
    },
    props: {
      exerciseId: {
        type: String,
        requires: true,
      },
      exerciseTitle: {
        type: String,
        required: true,
      },
    },
    computed: {
      exercise() {
        return ContentNodeKinds.EXERCISE;
      },
    },
  };

</script>


<style lang="stylus" scoped></style>

