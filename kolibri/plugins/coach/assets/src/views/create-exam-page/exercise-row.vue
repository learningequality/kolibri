<template>

  <tr>
    <th class="col-checkbox"><input type="checkbox" :checked="isSelected" @change="changeSelection"></th>
    <td class="col-title">
      <content-icon :kind="exercise"/>
      <span>{{ exerciseTitle }}</span>
    </td>
    <td class="col-selection"></td>
  </tr>

</template>


<script>

  const ContentNodeKinds = require('kolibri.coreVue.vuex.constants').ContentNodeKinds;

  module.exports = {
    $trNameSpace: 'exerciseRow',
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
      exerciseNumAssesments: {
        type: Number,
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
        return this.selectedExercises.some(
          selectedExercise => selectedExercise.id === this.exerciseId);
      },
    },
    methods: {
      changeSelection() {
        if (this.isSelected) {
          this.$emit('removeExercise', { id: this.exerciseId, title: this.exerciseTitle, numAssessments: this.exerciseNumAssesments });
        } else {
          this.$emit('addExercise', { id: this.exerciseId, title: this.exerciseTitle, numAssessments: this.exerciseNumAssesments });
        }
      },
    },
  };

</script>


<style lang="stylus" scoped></style>

