<template>

  <li>
    <div>
      {{ $tr('nthExerciseName', { name: exerciseName, number: questionNumberWithinExercise+1 }) }}
      <CoachContentLabel
        class="coach-content-label"
        :value="isCoachContent ? 1 : 0"
        :isTopic="false"
      />
    </div>

    <KGrid>
      <KGridItem size="50" percentage>
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
      </KGridItem>
      <KGridItem size="50" percentage alignment="right">
        <KButton
          ref="btn"
          :text="$tr('preview')"
          :disabled="isSelected"
          :appearance="isSelected ? 'flat-button' : 'raised-button'"
          @click="handleSelect"
        />
      </KGridItem>

    </KGrid>

  </li>

</template>


<script>

  import KButton from 'kolibri.coreVue.components.KButton';
  import KCheckbox from 'kolibri.coreVue.components.KCheckbox';
  import UiIconButton from 'keen-ui/src/UiIconButton';
  import CoachContentLabel from 'kolibri.coreVue.components.CoachContentLabel';
  import KGrid from 'kolibri.coreVue.components.KGrid';
  import KGridItem from 'kolibri.coreVue.components.KGridItem';

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
      KButton,
      KCheckbox,
      UiIconButton,
      CoachContentLabel,
      KGrid,
      KGridItem,
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
    methods: {
      handleSelect() {
        this.$emit('click');
        // this.$refs.btn.$el.blur();
      },
    },
  };

</script>


<style lang="scss" scoped>

</style>
