<template>

  <button
    class="item-wrapper"
    :class="{selected: isSelected, draggable }"
    @click="handleSelect"
  >
    <span class="text">{{ text }}</span>
    <CoachContentLabel
      class="coach-content-label"
      :value="isCoachContent ? 1 : 0"
      :isTopic="false"
    />
    <div v-if="draggable" class="handle">
      <DragIndicator />
    </div>
    <div class="hidden-buttons">
      <UiIconButton
        type="flat"
        ariaLabel="down"
        class="position-adjustment-button"
      >
        <mat-svg name="keyboard_arrow_down" category="hardware" />
      </UiIconButton>
    </div>
  </button>

</template>


<script>

  import UiIconButton from 'keen-ui/src/UiIconButton';
  import CoachContentLabel from 'kolibri.coreVue.components.CoachContentLabel';
  import DragIndicator from '../../new/shared/DragIndicator';

  export default {
    name: 'AssessmentQuestionListItem',
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
      UiIconButton,
      CoachContentLabel,
      DragIndicator,
    },
    props: {
      draggable: {
        type: Boolean,
        required: true,
      },
      questionNumberOfExercise: {
        type: Number,
        required: false,
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
        if (this.questionNumberOfExercise === undefined) {
          return this.exerciseName;
        }
        return this.$tr('nthExerciseName', {
          name: this.exerciseName,
          number: this.questionNumberOfExercise + 1,
        });
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
    display: block;
    width: 100%;
    padding: 8px;
    overflow: hidden;
    text-align: left;
    text-overflow: ellipsis;
    white-space: nowrap;
    background-color: white;
    border-radius: 4px;
  }

  .selected {
    background-color: #d8d8d8;
  }

  .draggable {
    padding-right: 50px;
    padding-left: 50px;
    cursor: grab;
  }

  .nowrap {
    white-space: nowrap;
  }

  .text {
    cursor: pointer;
  }

  .handle {
    position: absolute;
    top: 6px;
    right: 8px;
  }

  .hidden-buttons {
    display: none;
  }

</style>
