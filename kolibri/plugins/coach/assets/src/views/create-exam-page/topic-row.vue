<template>

  <tr>
    <td class="col-icon">
      <content-icon :kind="topic"/>
    </td>
    <td class="col-title">
      <button v-if="topicHasExercises" class="title" @click="$emit('goToTopic', topicId)">{{ topicTitle }}</button>
      <span v-else>{{ topicTitle }}</span>
    </td>
    <td class="col-add">
      <icon-button
        v-if="topicHasExercises && allExercisesWithinTopicSelected"
        :text="$tr('removeAllExercises')"
        :primary="false"
        @click="$emit('removeTopicExercises', allExercisesWithinTopic, topicTitle)">
        <mat-svg category="content" name="remove"/>
      </icon-button>
      <icon-button
        v-if="topicHasExercises && noExercisesWithinTopicSelected"
        :text="$tr('addAllExercises')"
        :primary="true"
        @click="$emit('addTopicExercises', allExercisesWithinTopic, topicTitle)">
        <mat-svg category="content" name="add"/>
      </icon-button>
      <icon-button
        v-if="topicHasExercises && someExercisesWithinTopicSelected"
        :text="$tr('addAllExercises')"
        :primary="true"
        @click="$emit('addTopicExercises', allExercisesWithinTopic, topicTitle)">
        <mat-svg category="content" name="add"/>
      </icon-button>
    </td>
  </tr>

</template>


<script>

  const ContentNodeKinds = require('kolibri.coreVue.vuex.constants').ContentNodeKinds;

  module.exports = {
    $trNameSpace: 'topicRow',
    $trs: {
      removeAllExercises: 'Remove all exercises',
      addAllExercises: 'Add all exercises',
    },
    components: {
      'content-icon': require('kolibri.coreVue.components.contentIcon'),
      'icon-button': require('kolibri.coreVue.components.iconButton'),
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
      allExercisesWithinTopicSelected() {
        if (this.allExercisesWithinTopic.length === 0) {
          return false;
        }
        return this.allExercisesWithinTopic.every(
            exercise => this.selectedExercises.includes(exercise));
      },
      noExercisesWithinTopicSelected() {
        return this.allExercisesWithinTopic.every(
            exercise => !this.selectedExercises.includes(exercise));
      },
      someExercisesWithinTopicSelected() {
        return !this.allExercisesWithinTopicSelected && !this.noExercisesWithinTopicSelected;
      }
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .title
    padding: 0
    border: none
    font-size: 1em

</style>

