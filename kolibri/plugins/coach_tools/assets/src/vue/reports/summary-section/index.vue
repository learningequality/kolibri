<template>

  <div class="summary-section">

    <!--TOPICS-->
    <div v-if="kind === Kinds.TOPIC">
      <p>{{ exercisecount }} Exercises - {{ contentcount }} Content Items</p>
      <p>Last Active: {{ lastActiveText }}</p>
      <div>
        <p>Exercises</p>
        <progress-bar
          v-if="exerciseprogress !== undefined"
          :progress="exerciseprogress"
        ></progress-bar>
        <span v-else>{{ $tr('na') }}</span>
      </div>
      <div>
        <p>Content</p>
        <progress-bar
          v-if="contentprogress !== undefined"
          :progress="contentprogress"
        ></progress-bar>
        <span v-else>{{ $tr('na') }}</span>
      </div>
    </div>

    <!--EXERCISE-->
    <div v-if="kind === Kinds.EXERCISE">
      <p>{{ questions_count }} Questions - Mastery Model: {{ mastery_model }}</p>
      <p>Last Active: {{ last_active }}</p>
      <div v-if="singleuser">
        <p>{{ questions_answered }} Questions Answered - {{ attempts }} Attempts - {{ time_spent }} -
          {{ date_mastered }}</p>
      </div>
      <div v-else>
        <p>Mastered:</p>
        <p>{{ exercise_mastered }} / {{ exercise_total }} Learners</p>
      </div>
    </div>

    <!--VIDEO-->
    <div v-if="kind === Kinds.VIDEO ">
      <p>{{ duration }}</p>
      <p>Last Active: {{ last_active }}</p>
      <div v-if="singleuser">
        <p>{{ time_spent }}</p>
        <progress-bar :progress="video_progress"></progress-bar>
      </div>
      <div v-else>
        <progress-bar :progress="video_progress"></progress-bar>
      </div>
    </div>

    <!--DOCUMENT/AUDIO-->
    <div v-if="kind === (Kinds.DOCUMENT || Kinds.AUDIO)">
      <p>{{ pages }} Pages</p>
      <p>Last Active: {{ last_active }}</p>
      <div v-if="singleuser">
        <p>
          <span v-if="document_progress === 1.000">Viewed - {{ time_spent }}</span>
          <span v-else>Not Viewed</span>
        </p>
      </div>
      <div v-else>
        <progress-bar :progress="document_progress"></progress-bar>
      </div>
    </div>
  </div>

</template>


<script>

  const CoreConstants = require('kolibri.coreVue.vuex.constants');

  module.exports = {
    $trNameSpace: 'report-summary',
    $trs: {
      lastActiveText: '{0, date, medium}',
      na: 'not applicable',
    },
    computed: {
      lastActiveText() {
        if (this.lastactive) {
          return this.$tr('lastActiveText', new Date(this.lastactive));
        }
        return '–';
      },
      Kinds() {
        return CoreConstants.ContentNodeKinds;
      },
    },
    props: {
      kind: {
        type: String,
        required: true,
      },
      exercisecount: {
        type: Number,
        required: true,
      },
      exerciseprogress: {
        type: Number,
        required: false,
      },
      contentcount: {
        type: Number,
        required: true,
      },
      contentprogress: {
        type: Number,
        required: false,
      },
      lastactive: {
        type: String,
      },
      singleuser: {
        type: Boolean,
        required: true,
      },
    },
    data: () => ({
      questions_count: 20,
      mastery_model: '3 out of 5 correct',
      questions_answered: 20,
      attempts: 40,
      time_spent: '3:40:32',
      exercise_mastered: 20,
      exercise_total: 100,
      date_mastered: 'Oct 31 2016',
      video_progress: 0.75,
      pages: 300,
      document_progress: 1.0,
    }),
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

  .summary-section
    padding: 20px
    background-color: white

</style>
