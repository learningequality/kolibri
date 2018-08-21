<template>

  <tr>
    <th class="core-table-checkbox-col">
      <k-checkbox
        v-if="!channel"
        :label="$tr('selectTopic')"
        :showLabel="false"
        :checked="allExercisesWithinTopicSelected"
        :indeterminate="someExercisesWithinTopicSelected"
        @change="changeSelection"
      />
    </th>
    <td class="core-table-main-col">
      <div class="topic-title">
        <content-icon :kind="topic" :class="{ disabled: !topicHasExercises }" />
        <button class="title" @click="$emit('goToTopic', topicId)">
          {{ topicTitle }}
        </button>
      </div>
      <coach-content-label
        class="coach-content-label"
        :value="numCoachContents"
        :isTopic="true"
      />
    </td>
    <td>
      <template v-if="!noExercisesWithinTopicSelected">
        {{
          $tr(
            'exercisesSelected',
            { selected: numExercisesWithinTopicSelected, total: numExercisesWithinTopic }
          )
        }}
      </template>
    </td>
  </tr>

</template>


<script>

  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import coachContentLabel from 'kolibri.coreVue.components.coachContentLabel';
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
      coachContentLabel,
      contentIcon,
      kButton,
      kCheckbox,
    },
    props: {
      channel: {
        type: Boolean,
        default: false,
      },
      topicId: {
        type: String,
        requires: true,
      },
      topicTitle: {
        type: String,
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
          this.$emit(
            'addTopicExercises',
            this.allExercisesWithinTopic,
            this.topicTitle,
            this.topicId
          );
        }
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .topic-title
    display: inline-block

  .coach-content-label
    display: inline-block
    vertical-align: bottom
    margin-left: 8px

  .title
    padding: 0
    border: none
    font-size: 1em
    color: $core-action-normal
    text-decoration: underline

  .disabled
    color: $core-text-disabled

</style>
