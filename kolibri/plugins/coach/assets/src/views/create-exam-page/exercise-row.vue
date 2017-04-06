<template>

  <tr>
    <td class="col-icon">
      <content-icon :kind="exercise"/>
    </td>
    <td class="col-title">
      <span>{{ exerciseTitle }}</span>
    </td>
    <td class="col-add">
      <icon-button
        v-if="isSelected"
        :text="$tr('removeExercise')"
        :primary="false"
        @click="$emit('removeExercise', exerciseId, exerciseTitle)">
        <mat-svg category="content" name="remove"/>
      </icon-button>
      <icon-button
        v-else
        :text="$tr('addExercise')"
        :primary="true"
        @click="$emit('addExercise', exerciseId, exerciseTitle)">
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
      addExercise: 'Add exercise',
      removeExercise: 'Remove exercise',
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
      selectedExercises: {
        type: Array,
        required: true,
      },
    },
    computed: {
      exercise() {
        return ContentNodeKinds.EXERCISE;
      },
      isSelected() {
        return this.selectedExercises.includes(this.exerciseId);
      },
    },
  };

</script>


<style lang="stylus" scoped></style>

