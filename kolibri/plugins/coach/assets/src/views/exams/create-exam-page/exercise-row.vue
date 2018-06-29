<template>

  <tr>
    <th class="core-table-checkbox-col">
      <k-checkbox
        :label="$tr('selectExercise')"
        :showLabel="false"
        :checked="isSelected"
        @change="changeSelection"
      />
    </th>
    <td class="col-table-main-col">
      <div class="exercise-title">
        <content-icon :kind="exercise" />
        <span>{{ exerciseTitle }}</span>
      </div>
      <coach-content-label
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
  import coachContentLabel from 'kolibri.coreVue.components.coachContentLabel';
  import contentIcon from 'kolibri.coreVue.components.contentIcon';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kCheckbox from 'kolibri.coreVue.components.kCheckbox';

  export default {
    name: 'exerciseRow',
    $trs: {
      selectExercise: 'Select exercise',
    },
    components: {
      coachContentLabel,
      contentIcon,
      kButton,
      kCheckbox,
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


<style lang="stylus" scoped>

  .exercise-title
    display: inline-block

  .coach-content-label
    display: inline-block
    vertical-align: bottom
    margin-left: 8px

</style>
