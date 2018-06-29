<template>

  <section class="question-list">

    <h2 class="header">
      {{ $tr('questionListHeader', {numOfQuestions:questions.length}) }}
    </h2>

    <ul class="list">
      <!-- technically, these should be buttons -->
      <li
        v-for="(question, index) in questions"
        class="item"
        :key="index"
      >
        <k-button
          @click="$emit('select',index)"
          :class="{selected: index === selectedIndex}"
          class="button"
          :text="questionLabel(index)"
          appearance="flat-button"
        />
      </li>
    </ul>

  </section>

</template>


<script>

  import kButton from 'kolibri.coreVue.components.kButton';

  export default {
    name: 'questionList',
    components: {
      kButton,
    },
    $trs: {
      questionListHeader: '{numOfQuestions, number} Questions',
      questionLabel: 'Question { questionNumber, number }',
    },
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
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  $item-content-height = 56px
  $item-division-height = 2px

  .question-list
    background-color: white

  .header, .list, .item, .button
    display: block
    width: 100%
    padding: 0
    margin: 0

  .list
    list-style: none

  // normalize styles for the 2
  .button, .header
    line-height: $item-content-height
    vertical-align: middle
    padding-left: 16px
    font-size: 16px
    border-bottom: $item-division-height solid $core-text-disabled

  .button
    text-align: left
    font-weight: normal
    text-transform: none
    border-radius: 0
    &.selected
      background-color: $core-grey-300 // duped from k-button
      font-weight: bold

</style>
