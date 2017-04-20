<template>

  <div class="interaction-list">
  <!--TODO-->
    <h3 class="header">{{ $tr('questionHeader', {questionNumber: attemptNumber + 1}) }}</h3>
    <p>{{ $tr('currAnswer', {ordinal: selectedInteractionIndex + 1 }) }}</p>
    <div class="attempt-container">

      <interaction-item
        v-for="(interaction, index) in interactions"
        @click.native="setCurrentInteractionIndex(index)"
        :selected="isSelected(index)"
        :interaction="interaction"
      />

    </div>
  </div>

</template>


<script>

  const responsiveElement = require('kolibri.coreVue.mixins.responsiveElement');

  module.exports = {
    mixins: [responsiveElement],
    $trNameSpace: 'coachExerciseQuestionAttempt',
    $trs: {
      currAnswer: '{ordinal, selectordinal, one {#st} two {#nd} few {#rd} other {#th}} answer',
      questionHeader: 'Question {questionNumber, number} attempts'
    },
    components: {
      'interaction-item': require('./interaction-item'),
    },
    props: {
      interactions: {
        type: Array,
        required: true,
      },
      selectedInteractionIndex: {
        // default: 0,
        // validate: TODO
      },
      attemptNumber: {
        required: true,
      },
    },
    methods: {
      setCurrentInteractionIndex(index) {
        this.$emit('select', index);
      },
      isSelected(index) {
        return this.selectedInteractionIndex === index;
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .interaction-list
    background-color: $core-bg-light
    height: 150px
    padding-left: 20px

  .header
    margin-top: 0
    padding-top: 10px

  .attempt-container
    // margin-top: 4px
    display: inline
    overflow-x: auto
    white-space: nowrap

  .pagination-btn
    width: 40px
    height: 40px
    margin: 10px

  .pagination-right
    right: 0
    position: absolute

  .enable
    fill: $core-text-default
    cursor: pointer

  .disable
    fill: $core-text-disabled
    pointer-events: none

</style>
