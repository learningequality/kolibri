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

    <p>
      {{ interactionsMessage }}
    </p>

  </div>

</template>


<script>

  import responsiveElementMixin from 'kolibri.coreVue.mixins.responsiveElementMixin';
  import InteractionItem from './InteractionItem';

  export default {
    name: 'InteractionList',
    components: { InteractionItem },
    mixins: [responsiveElementMixin],
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
    computed: {
      interactionsMessage() {
        const numAttempts = this.interactions.length;
        if (numAttempts === 0) {
          return this.$tr('noInteractions');
        }
        if (numAttempts > 1) {
          return this.$tr('currAnswer', { value: this.selectedInteractionIndex + 1 });
        }
        return '';
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
    $trs: {
      currAnswer: 'Attempt {value, number, integer}',
      noInteractions: 'No attempts made on this question',
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
