<template>

  <tr>
    <th class="core-table-checkbox-col">
      <k-checkbox
        :label="$tr('selectTopic')"
        :showLabel="false"
        :checked="allExercisesWithinTopicSelected"
        :indeterminate="someExercisesWithinTopicSelected"
        @change="changeSelection"
      />
    </th>
    <td class="core-table-main-col">
      <div class="topic-title">
        <content-icon :kind="topic" />
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
    name: 'TopicRow',
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
      numExercisesWithinTopic() {
        return this.allExercisesWithinTopic.length;
      },
      numExercisesWithinTopicSelected() {
        return this.allExercisesWithinTopic.filter(this.exerciseIsSelected).length;
      },
      allExercisesWithinTopicSelected() {
        return this.allExercisesWithinTopic.every(this.exerciseIsSelected);
      },
      noExercisesWithinTopicSelected() {
        return this.allExercisesWithinTopic.every(exercise => !this.exerciseIsSelected(exercise));
      },
      someExercisesWithinTopicSelected() {
        return !this.allExercisesWithinTopicSelected && !this.noExercisesWithinTopicSelected;
      },
    },
    methods: {
      exerciseIsSelected(exercise) {
        return this.selectedExercises.some(selectedExercise => selectedExercise.id === exercise.id);
      },
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


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .topic-title {
    display: inline-block;
  }

  .coach-content-label {
    display: inline-block;
    margin-left: 8px;
    vertical-align: bottom;
  }

  .title {
    padding: 0;
    font-size: 1em;
    border: 0;
  }

</style>
