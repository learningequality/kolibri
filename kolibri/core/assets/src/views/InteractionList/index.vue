<template>

  <div class="interaction-list">
    <div class="attempt-container">
      <InteractionItem
        v-for="(interaction, index) in interactions"
        :key="index"
        :selected="isSelected(index)"
        :interaction="interaction"
        @click.native="!isSelected(index) ? setCurrentInteractionIndex(index) : null"
      />
    </div>

    <p>
      {{ interactionsMessage }}
    </p>
  </div>

</template>


<script>

  import InteractionItem from './InteractionItem';

  export default {
    name: 'InteractionList',
    components: { InteractionItem },
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
      currAnswer: {
        message: 'Attempt {value, number, integer}',
        context:
          'This text appears on a report when a coach reviews the answers a learner has given for a quiz. It can indicate how many times the learner has tried to answer a question, for example.\n\nThis helps the coach understand which questions learners had difficulties answering correctly.',
      },
      noInteractions: {
        message: 'No attempts made on this question',
        context:
          "When a learner views their report, they can see how many times they attempted to answer a question in a quiz.\n\nIf the learner hasn't made any attempts at all to answer the question this message displays beside the question.",
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
