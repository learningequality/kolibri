<template>

  <div class="interaction-list">
  <!--TODO-->
    <h3 class="header">{{ $tr('attempts', {number: interactions.length}) }}</h3>
    <p>{{ $tr('currAnswer', {ordinal: selectedInteractionIndex + 1 }) }}</p>
    <div class="attempt-container">

      <attempt-box
        v-for="(interaction, index) in interactions"
        @click.native="setCurrentInteraction(index)"
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
    },
    components: {
      'attempt-box': require('./attempt-box'),
    },
    props: {
      interactions: {
        type: Array,
        required: true,
      },
      value: {
        type: Object,
        required: true,
        // default: this.interactions[0],
        // validate: TODO
      },
    },
    data() {
      return {
        selectedInteractionIndex: 0,
        currPage: 1,
      };
    },
    created() {
      this.setCurrentInteraction(this.selectedInteractionIndex);
    },
    methods: {
      setCurrentInteraction(interactionIndex) {
        this.selectedInteractionIndex = interactionIndex;
        this.$emit('input', this.interactions[interactionIndex]);
      },
      isSelected(interactionIndex) {
        return this.selectedInteractionIndex === interactionIndex;
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
