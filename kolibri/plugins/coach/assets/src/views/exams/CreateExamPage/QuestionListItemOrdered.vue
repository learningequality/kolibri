<template>

  <li class="item-wrapper" :class="{selected: isSelected }">
    <KButton
      v-if="!isSelected"
      class="nowrap"
      :text="text"
      :disabled="isSelected"
      appearance="basic-link"
      @click="handleSelect"
    />
    <span v-else class="selected">{{ text }}</span>
    <CoachContentLabel
      class="coach-content-label"
      :value="isCoachContent ? 1 : 0"
      :isTopic="false"
    />
    <div class="handle">
      <mat-svg name="drag_handle" category="editor" />
    </div>
    <div class="hidden-buttons">
      <UiIconButton
        type="flat"
        ariaLabel="up"
        class="position-adjustment-button"
      >
        <mat-svg name="keyboard_arrow_up" category="hardware" />
      </UiIconButton>
      <UiIconButton
        type="flat"
        ariaLabel="down"
        class="position-adjustment-button"
      >
        <mat-svg name="keyboard_arrow_down" category="hardware" />
      </UiIconButton>
    </div>
  </li>

</template>


<script>

  import KButton from 'kolibri.coreVue.components.KButton';
  import UiIconButton from 'keen-ui/src/UiIconButton';
  import CoachContentLabel from 'kolibri.coreVue.components.CoachContentLabel';

  export default {
    name: 'QuestionListItemOrdered',
    $trs: {
      questionNum: 'Question {number, number, integer}:',
      questionNumShort: '{number, number, integer}.',
      preview: 'Preview',
      view: 'View',
      nthExerciseName: '{ name } ({number, number, integer})',
      moveExerciseUp: 'Move this exercise up by one position',
      moveExerciseDown: 'Move this exercise down by one position',
    },
    components: {
      KButton,
      UiIconButton,
      CoachContentLabel,
    },
    props: {
      questionNumberWithinExam: {
        type: Number,
        required: true,
      },
      questionNumberWithinExercise: {
        type: Number,
        required: true,
      },
      totalFromExercise: {
        type: Number,
        required: true,
      },
      isSelected: {
        type: Boolean,
        required: true,
      },
      exerciseName: {
        type: String,
        required: true,
      },
      isCoachContent: {
        type: Boolean,
        required: true,
      },
    },
    computed: {
      text() {
        return this.exerciseName;
        // return this.$tr('nthExerciseName', {
        //   name: this.exerciseName,
        //   number: this.questionNumberWithinExercise + 1,
        // });
      },
    },
    methods: {
      handleSelect() {
        this.$emit('click');
      },
    },
  };

</script>


<style lang="scss" scoped>

  .item-wrapper {
    position: relative;
    left: -8px;
    padding: 8px;
    padding-right: 50px;
    padding-left: 50px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    background-color: white;
  }

  .nowrap {
    white-space: nowrap;
  }

  .selected {
    font-weight: bold;
    border-radius: 4px;
  }

  .handle {
    position: absolute;
    top: 6px;
    right: 8px;
    cursor: pointer;
  }

  .hidden-buttons {
    display: none;
  }

</style>
