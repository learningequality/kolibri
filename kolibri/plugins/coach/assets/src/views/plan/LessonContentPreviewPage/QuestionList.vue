<template>

  <section :style="{ backgroundColor: $themeTokens.surface }">

    <h2 class="header">
      {{ $tr('questionListHeader', {numOfQuestions:questions.length}) }}
    </h2>

    <ul class="list">
      <!-- technically, these should be buttons -->
      <li
        v-for="(question, index) in questions"
        :key="index"
        class="item"
      >
        <KButton
          :class="{selected: index === selectedIndex}"
          :style="buttonStyle(index)"
          class="button"
          :text="questionLabel(index)"
          appearance="flat-button"
          @click="$emit('select',index)"
        />
      </li>
    </ul>

  </section>

</template>


<script>

  export default {
    name: 'QuestionList',
    props: {
      questions: {
        type: Array,
        required: true,
      },
      selectedIndex: {
        type: Number,
        required: true,
      },
      questionLabel: {
        type: Function,
        required: true,
        // simple validator, makes sure the function returns a string
        validator: value => typeof value(0) === 'string',
      },
    },
    methods: {
      buttonStyle(index) {
        return {
          backgroundColor: index === this.selectedIndex ? this.$themePalette.grey.v_300 : '',
        };
      },
    },
    $trs: {
      questionListHeader: '{numOfQuestions, number} Questions',
    },
  };

</script>


<style lang="scss" scoped>

  .header,
  .list,
  .item,
  .button {
    display: block;
    width: 100%;
    padding: 0;
    margin: 0;
  }

  .list {
    list-style: none;
  }

  // normalize styles for the 2
  .button,
  .header {
    padding-left: 16px;
    font-size: 16px;
    line-height: 56px;
    vertical-align: middle;
  }

  .button {
    font-weight: normal;
    text-align: left;
    text-transform: none;
    border-radius: 0;
    &.selected {
      font-weight: bold;
    }
  }

</style>
