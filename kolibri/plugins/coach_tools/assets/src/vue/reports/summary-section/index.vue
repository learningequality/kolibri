<template>

  <div class="summary-section">

    <!--TOPICS-->
    <div v-if="kind === 'topic'">
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
    <div v-if="kind === 'exercise'">
      <!--<p>{{ questions_count }} Questions - Mastery Model: {{ mastery_model }}</p>-->
      <p>Last Active: {{ lastActiveText }}</p>
      <div v-if="singleuser">
        <!--TODO: Should just be one of the 3 progress states.-->
        <progress-bar :progress="exerciseprogress"></progress-bar>
      </div>
      <div v-else>
        <p>
          contentcount {{ contentcount }} |
          contentprogress {{ contentprogress }} |
          exerciseprogress {{ exerciseprogress }} |
          exercisecount {{ exercisecount }}
        </p>
      </div>
    </div>

    <!--VIDEO/AUDIO-->
    <div v-if="kind === 'video' ">
      <p>Last Active: {{ lastActiveText }}</p>
      <div v-if="singleuser">
        <!--TODO: Should just be one of the 3 progress states.-->
        <progress-bar :progress="contentprogress"></progress-bar>
      </div>
      <div v-else>
        contentcount {{ contentcount }} |
        contentprogress {{ contentprogress }} |
        exerciseprogress {{ exerciseprogress }} |
        exercisecount {{ exercisecount }}
        <progress-bar :progress="contentprogress"></progress-bar>
      </div>
    </div>

    <!--DOCUMENT-->
    <div v-if="kind === ('document' || 'audio')">
      <p>Last Active: {{ lastActiveText }}</p>
      <div v-if="singleuser">
        <!--TODO: Should just be one of the 2 progress states, viewed or not.-->
        <progress-bar :progress="contentprogress"></progress-bar>
      </div>
      <div v-else>
        <progress-bar :progress="contentprogress"></progress-bar>
      </div>
    </div>
  </div>

</template>


<script>

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
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

  .summary-section
    padding: 20px
    background-color: white

</style>
