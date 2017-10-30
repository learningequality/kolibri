<template>

  <tr>
    <th class="col-checkbox">
      <k-checkbox
        :label="$tr('selectTopic')"
        :showLabel="false"
        :checked="allExercisesWithinTopicSelected"
        :indeterminate="someExercisesWithinTopicSelected"
        :disabled="!topicHasExercises"
        @change="changeSelection"
      />
    </th>
    <td class="col-title">
      <content-icon :kind="topic" :class="{ disabled: !topicHasExercises }" />
      <button v-if="topicHasExercises" class="title" @click="$emit('goToTopic', topicId)">{{ topicTitle }}</button>
      <span v-else class="disabled">{{ topicTitle }}</span>
    </td>
    <td class="col-selection">
      <template v-if="!noExercisesWithinTopicSelected">
      {{ $tr('exercisesSelected', { selected: numExercisesWithinTopicSelected, total: numExercisesWithinTopic }) }}
      </template>
    </td>
  </tr>

</template>


<script>

  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import contentIcon from 'kolibri.coreVue.components.contentIcon';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kCheckbox from 'kolibri.coreVue.components.kCheckbox';
  export default {
    name: 'topicRow',
    $trs: {
      exercisesSelected:
        '{selected, number} of {total, number} {total, plural, one {exercise} other {exercises}} selected',
      selectTopic: 'Select topic',
    },
    components: {
      contentIcon,
      kButton,
      kCheckbox,
    },
    props: {
      topicId: {
        type: String,
        requires: true,
      },
      topicTitle: {
        type: String,
        required: true,
      },
      selectedExercises: {
        type: Array,
        required: true,
      },
      allExercisesWithinTopic: {
        type: Array,
        required: true,
      },
    },
    computed: {
      topic() {
        return ContentNodeKinds.TOPIC;
      },
      topicHasExercises() {
        return this.allExercisesWithinTopic.length !== 0;
      },
      numExercisesWithinTopic() {
        return this.allExercisesWithinTopic.length;
      },
      numExercisesWithinTopicSelected() {
        return this.allExercisesWithinTopic.filter(exercise =>
          this.selectedExercises.some(selectedExercise => selectedExercise.id === exercise.id)
        ).length;
      },
      allExercisesWithinTopicSelected() {
        if (!this.topicHasExercises) {
          return false;
        }
        return this.allExercisesWithinTopic.every(exercise =>
          this.selectedExercises.some(selectedExercise => selectedExercise.id === exercise.id)
        );
      },
      noExercisesWithinTopicSelected() {
        return this.allExercisesWithinTopic.every(
          exercise =>
            !this.selectedExercises.some(selectedExercise => selectedExercise.id === exercise.id)
        );
      },
      someExercisesWithinTopicSelected() {
        return !this.allExercisesWithinTopicSelected && !this.noExercisesWithinTopicSelected;
      },
    },
    methods: {
      changeSelection() {
        if (this.allExercisesWithinTopicSelected) {
          this.$emit('removeTopicExercises', this.allExercisesWithinTopic, this.topicTitle);
        } else {
          this.$emit('addTopicExercises', this.allExercisesWithinTopic, this.topicTitle);
        }
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .title
    padding: 0
    border: none
    font-size: 1em

  .disabled
    color: $core-text-disabled

</style>

