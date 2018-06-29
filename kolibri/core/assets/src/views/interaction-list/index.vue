<template>

  <div class="interaction-list">
    <!--TODO-->
    <template v-if="interactions.length">
      <p>{{ $tr('currAnswer', {ordinal: selectedInteractionIndex + 1 }) }}</p>
    </template>

    <p v-else>{{ $tr('noInteractions') }}</p>
    <div class="attempt-container">

      <interaction-item
        v-for="(interaction, index) in interactions"
        :key="index"
        @click.native="setCurrentInteractionIndex(index)"
        :selected="isSelected(index)"
        :interaction="interaction"
      />

    </div>
  </div>

</template>


<script>

  import responsiveElement from 'kolibri.coreVue.mixins.responsiveElement';
  import interactionItem from './interaction-item';

  export default {
    name: 'interactionList',
    components: { interactionItem },
    mixins: [responsiveElement],
    $trs: {
      currAnswer: '{ordinal, selectordinal, one {#st} two {#nd} few {#rd} other {#th}} answer',
      noInteractions: 'No attempts made on this question',
    },
    props: {
      interactions: {
        type: Array,
        required: true,
      },
      selectedInteractionIndex: {
        type: Number,
        required: true,
      },
    },
    methods: {
      setCurrentInteractionIndex(index) {
        this.$emit('select', index);
      },
      isSelected(index) {
        return Number(this.selectedInteractionIndex) === index;
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .header
    margin-top: 0
    padding-top: 10px

  .attempt-container
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
