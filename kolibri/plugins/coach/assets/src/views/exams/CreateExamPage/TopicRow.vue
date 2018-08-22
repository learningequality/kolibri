<template>

  <tr>
    <th class="core-table-checkbox-col">
      <KCheckbox
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
        <ContentIcon :kind="topic" />
        <button class="title" @click="$emit('goToTopic', topicId)">
          {{ topicTitle }}
        </button>
      </div>
      <CoachContentLabel
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
  import CoachContentLabel from 'kolibri.coreVue.components.CoachContentLabel';
  import ContentIcon from 'kolibri.coreVue.components.ContentIcon';
  import KButton from 'kolibri.coreVue.components.KButton';
  import KCheckbox from 'kolibri.coreVue.components.KCheckbox';

  export default {
    name: 'TopicRow',
    $trs: {
      exercisesSelected:
        '{selected, number} of {total, number} {total, plural, one {exercise} other {exercises}} selected',
      selectTopic: 'Select topic',
    },
    components: {
      CoachContentLabel,
      ContentIcon,
      KButton,
      KCheckbox,
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
    color: $core-action-normal;
    text-decoration: underline;
    border: 0;
  }

</style>
