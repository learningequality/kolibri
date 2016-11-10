<template>

  <div class="summary-section">

    <!--TOPICS-->
    <div v-if="contentSummary.kind === 'topic'">
      <p>{{ exerciseCount }} Exercises - {{ contentCount }} Content Items</p>
      <p>Last Active: {{ lastActiveText }}</p>
      <div>
        <p>Exercises</p>
        <progress-bar :progress="exerciseProgress"></progress-bar>
      </div>
      <div>
        <p>Content</p>
        <progress-bar :progress="contentProgress"></progress-bar>
      </div>
    </div>

    <!--EXERCISE-->
    <div v-if="contentSummary.kind === 'exercise'">
      <p>{{ questions_count }} Questions - Mastery Model: {{ mastery_model }}</p>
      <p>Last Active: {{ last_active }}</p>
      <div v-if="userSummary.full_name">
        <p>{{ questions_answered }} Questions Answered - {{ attempts }} Attempts - {{ time_spent }} -
          {{ date_mastered }}</p>
      </div>
      <div v-else>
        <p>Mastered:</p>
        <p>{{ exercise_mastered }} / {{ exercise_total }} Learners</p>
      </div>
    </div>

    <!--VIDEO/AUDIO-->
    <div v-if="contentSummary.kind === 'video' ">
      <p>{{ duration }}</p>
      <p>Last Active: {{ last_active }}</p>
      <div v-if="userSummary.full_name">
        <p>{{ time_spent }}</p>
        <progress-bar :progress="video_progress"></progress-bar>
      </div>
      <div v-else>
        <progress-bar :progress="video_progress"></progress-bar>
      </div>
    </div>

    <!--DOCUMENT-->
    <div v-if="contentSummary.kind === ('document' || 'audio')">
      <p>{{ pages }} Pages</p>
      <p>Last Active: {{ last_active }}</p>
      <div v-if="userSummary.full_name">
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

  /* given an array of objects sum the keys on those that pass the filter */
  function sumOfKeys(array, key, filter = () => true) {
    return array
      .filter(filter)
      .reduce((prev, item) => prev + item[key], 0);
  }

  module.exports = {
    $trNameSpace: 'report-summary',
    $trs: {
      lastActiveText: '{0, date, medium}',
    },
    computed: {
      exerciseCount() {
        return sumOfKeys(
          this.contentSummary.progress,
          'node_count',
          item => item.kind === 'exercise'
        );
      },
      exerciseProgress() {
        const totalProgress = sumOfKeys(
          this.contentSummary.progress,
          'total_progress',
          item => item.kind === 'exercise'
        );
        return totalProgress / this.exerciseCount;
      },
      contentCount() {
        return sumOfKeys(
          this.contentSummary.progress,
          'node_count',
          item => item.kind !== 'exercise'
        );
      },
      contentProgress() {
        const totalProgress = sumOfKeys(
          this.contentSummary.progress,
          'total_progress',
          item => item.kind !== 'exercise'
        );
        return totalProgress / this.contentCount;
      },
      lastActiveText() {
        if (this.contentSummary.last_active) {
          return this.$tr('lastActiveText', new Date(this.contentSummary.last_active));
        }
        return '–';
      },
    },
    vuex: {
      getters: {
        loading: state => state.core.loading,
        contentSummary: state => state.pageState.content_scope_summary,
        userSummary: state => state.pageState.user_scope_summary,
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
