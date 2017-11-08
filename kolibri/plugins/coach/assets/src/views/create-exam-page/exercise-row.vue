<template>

  <tr>
    <th class="col-checkbox">
      <k-checkbox
        :label="$tr('selectExercise')"
        :showLabel="false"
        :checked="isSelected"
        @change="changeSelection"
      />
    </th>
    <td class="col-title">
      <content-icon :kind="exercise" />
      <span>{{ exerciseTitle }}</span>
    </td>
    <td class="col-selection"></td>
  </tr>

</template>


<script>

  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import contentIcon from 'kolibri.coreVue.components.contentIcon';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kCheckbox from 'kolibri.coreVue.components.kCheckbox';

  export default {
    name: 'exerciseRow',
    $trs: {
      selectExercise: 'Select exercise',
    },
    components: {
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


<style lang="stylus" scoped></style>

