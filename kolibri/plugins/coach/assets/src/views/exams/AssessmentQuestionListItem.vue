<template>

  <li>
    <div>
      {{ $tr('nthExerciseName', { name: exerciseName, number: questionNumberWithinExercise+1 }) }}
    </div>

    <KButton
      :primary="isSelected"
      :text="$tr('preview')"
      @click="$emit('click')"
    />

    <CoachContentLabel
      class="coach-content-label"
      :value="isCoachContent ? 1 : 0"
      :isTopic="false"
    />
  </li>

</template>


<script>

  import KButton from 'kolibri.coreVue.components.KButton';
  import CoachContentLabel from 'kolibri.coreVue.components.CoachContentLabel';

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
  };

</script>


<style lang="scss" scoped></style>
