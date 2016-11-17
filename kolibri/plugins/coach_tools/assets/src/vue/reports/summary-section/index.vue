<template>

  <div class="summary-section">

    <!--TOPICS-->
    <div v-if="kind === Kinds.TOPIC" class="summary-section-row">
      <div class="summary-section-details">
        <p>{{ exercisecount }} {{ $tr('exercises') }} - {{ contentcount }} {{ $tr('content') }} {{ $tr('items') }}</p>
        <p>{{ numusers }} Users</p>
      </div>

      <div class="summary-section-progress">
        <p>{{ $tr('exercises') }}</p>
        <progress-bar v-if="exerciseprogress !== undefined" :progress="exerciseprogress"></progress-bar>
        <span v-else><p>{{ $tr('na') }}</p></span>
      </div>

      <div class="summary-section-progress">
        <p>{{ $tr('content') }}</p>
        <progress-bar v-if="contentprogress !== undefined" :progress="contentprogress"></progress-bar>
        <span v-else><p>{{ $tr('na') }}</p></span>
      </div>

      <div v-if="!isrecentview" class="summary-section-date">
        <p>{{ $tr('lastActive') }}: {{ lastActiveDate }}</p>
      </div>
    </div>


    <!--EXERCISES-->
    <div v-if="kind === Kinds.EXERCISE" class="summary-section-row">
      <div class="summary-section-details">

      </div>

      <div v-if="singleuser" class="summary-section-progress">
        <progress-icon :progress="1" :kind="kind" :showtext="true"></progress-icon>
      </div>

      <div v-else class="summary-section-progress">
        <p>{{ completioncount }}/{{ numusers }} {{ $tr('mastered') }}</p>
      </div>

      <div class="summary-section-date">
        <p>{{ $tr('lastActive') }}: {{ lastActiveDate }}</p>

      </div>
    </div>


    <!--VIDEO/AUDIO-->
    <div v-if="kind === (Kinds.VIDEO || Kinds.AUDIO)" class="summary-section-row">
      <div class="summary-section-details">

      </div>

      <div v-if="singleuser" class="summary-section-progress">
        <progress-icon :progress="contentprogress" :kind="kind" :showtext="true"></progress-icon>
      </div>


      <div v-else class="summary-section-progress">
        <p>
          {{ completioncount }}/{{ numusers }}
          <span v-if="kind === Kinds.VIDEO">{{ $tr('watched') }}</span>
          <span v-else>{{ $tr('listened') }}</span>
        </p>
      </div>

      <div class="summary-section-date">
        <p>{{ $tr('lastActive') }}: {{ lastActiveDate }}</p>
      </div>
    </div>


    <!--DOCUMENTS-->
    <div v-if="kind === Kinds.DOCUMENT" class="summary-section-row">
      <div class="summary-section-details">

      </div>

      <div v-if="singleuser" class="summary-section-progress">
        <progress-icon :progress="contentprogress" :kind="kind" :showtext="true"></progress-icon>
      </div>

      <div v-else class="summary-section-progress">
        <p>{{ completioncount }}/{{ numusers }} {{ $tr('viewed') }}</p>
      </div>

      <div class="summary-section-date">
        <p>{{ $tr('lastActive') }}: {{ lastActiveDate }}</p>
      </div>
    </div>

  </div>

</template>


<script>

  const CoreConstants = require('kolibri.coreVue.vuex.constants');

  module.exports = {
    $trNameSpace: 'report-summary',
    $trs: {
      lastActive: 'Last Active',
      lastActiveText: '{0, date, medium}',
      na: 'not applicable',
      exercises: 'Exercises',
      content: 'Content',
      items: 'Items',
      mastered: 'Mastered',
      watched: 'Watched',
      listened: 'Listened',
      viewed: 'Viewed',
    },
    computed: {
      lastActiveDate() {
        if (this.lastactive) {
          return this.$tr('lastActiveText', [new Date(this.lastactive)]);
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
      numusers: {
        type: Number,
        required: true,
      },
      completioncount: {
        type: Number,
        required: false,
      },
      isrecentview: {
        type: Boolean,
        required: true,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

  // TODO: DRY THIS UP
  .summary-section
    display: table
    width: 100%
    background-color: white

  .summary-section-row
    display: table-row

  .summary-section-details,
  .summary-section-progress,
  .summary-section-date
    display: table-cell
    padding: 10px
    vertical-align: top

  .summary-section-progress
    width: 20%

  .summary-section-date
    width: 150px

</style>
