<template>

  <div class="interaction-list">

    <div class="attempt-container">
      <InteractionItem
        v-for="(interaction, index) in interactions"
        :key="index"
        :selected="isSelected(index)"
        :interaction="interaction"
        @click.native="setCurrentInteractionIndex(index)"
      />
    </div>

    <p v-if="interactions.length">
      {{ $tr('currAnswer', {value: selectedInteractionIndex + 1 }) }}
    </p>
    <p v-else>
      {{ $tr('noInteractions') }}
    </p>

  </div>

</template>


<script>

  import responsiveElement from 'kolibri.coreVue.mixins.responsiveElement';
  import InteractionItem from './InteractionItem';

  export default {
    name: 'InteractionList',
    components: { InteractionItem },
    mixins: [responsiveElement],
    $trs: {
      currAnswer: 'Attempt {value, number, integer}',
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


<style lang="scss" scoped>

  .header {
    padding-top: 10px;
    margin-top: 0;
  }

  .attempt-container {
    overflow-x: auto;
    white-space: nowrap;
  }

  .pagination-btn {
    width: 40px;
    height: 40px;
    margin: 10px;
  }

  .pagination-right {
    position: absolute;
    right: 0;
  }

</style>
