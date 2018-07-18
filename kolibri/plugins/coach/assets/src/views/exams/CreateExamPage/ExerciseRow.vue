<template>

  <tr>
    <th class="core-table-checkbox-col">
      <KCheckbox
        :label="$tr('selectExercise')"
        :showLabel="false"
        :checked="isSelected"
        @change="changeSelection"
      />
    </th>
    <td class="col-table-main-col">
      <div class="exercise-title">
        <ContentIcon :kind="exercise" />
        <span>{{ exerciseTitle }}</span>
      </div>
      <CoachContentLabel
        class="coach-content-label"
        :value="numCoachContents"
        :isTopic="false"
      />
    </td>
    <td></td>
  </tr>

</template>


<script>

  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import CoachContentLabel from 'kolibri.coreVue.components.CoachContentLabel';
  import ContentIcon from 'kolibri.coreVue.components.ContentIcon';
  import KButton from 'kolibri.coreVue.components.KButton';
  import KCheckbox from 'kolibri.coreVue.components.KCheckbox';

  export default {
    name: 'ExerciseRow',
    $trs: {
      selectExercise: 'Select exercise',
    },
    components: {
      CoachContentLabel,
      ContentIcon,
      KButton,
      KCheckbox,
    },
    props: {
      exerciseId: {
        type: String,
        requires: true,
      },
      exerciseTitle: {
        type: String,
        required: true,
      },
      exerciseNumAssessments: {
        type: Number,
        required: true,
      },
      numCoachContents: {
        type: Number,
        default: 0,
      },
      selectedExercises: {
        type: Array,
        required: true,
      },
    },
    computed: {
      exercise() {
        return ContentNodeKinds.EXERCISE;
      },
      isSelected() {
        return this.selectedExercises.some(
          selectedExercise => selectedExercise.id === this.exerciseId
        );
      },
    },
    methods: {
      changeSelection() {
        if (this.isSelected) {
          this.$emit('removeExercise', {
            id: this.exerciseId,
            title: this.exerciseTitle,
            numAssessments: this.exerciseNumAssessments,
          });
        } else {
          this.$emit('addExercise', {
            id: this.exerciseId,
            title: this.exerciseTitle,
            numAssessments: this.exerciseNumAssessments,
          });
        }
      },
    },
  };

</script>


<style lang="scss" scoped>

  .exercise-title {
    display: inline-block;
  }

  .coach-content-label {
    display: inline-block;
    margin-left: 8px;
    vertical-align: bottom;
  }

</style>
