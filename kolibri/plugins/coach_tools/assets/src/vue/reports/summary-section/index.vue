<template>

  <div class="summary-section">

    <!--TOPICS-->
    <div v-if="kind === Kinds.TOPIC" class="summary-section-row">

      <div class="summary-section-details"></div>

      <div class="summary-section-progress">
        <div class="summary-section-details">
          {{ $tr('exerciseCountText', {count: exerciseCount}) }}
        </div>
        <div class="summary-section-heading">{{ $tr('exerciseProgress') }}</div>
        <progress-bar v-if="exerciseProgress !== undefined" :progress="exerciseProgress"/>
        <div v-else>{{ $tr('na') }}</div>
      </div>

      <div class="summary-section-progress">
        <div class="summary-section-details">
          {{ $tr('contentCountText', {count: contentCount}) }}
        </div>
        <div class="summary-section-heading">{{ $tr('contentProgress') }}</div>
        <progress-bar v-if="contentProgress !== undefined" :progress="contentProgress"/>
        <div v-else>{{ $tr('na') }}</div>
      </div>

      <div v-if="!isRecentView" class="summary-section-date">
        <div class="summary-section-details">{{ $tr('lastActive') }}:</div>
        {{ lastActiveDate }}
      </div>

    </div>


    <!--EXERCISES-->
    <div v-if="kind === Kinds.EXERCISE" class="summary-section-row">

      <div class="summary-section-details"></div>

      <div v-if="singleUser" class="summary-section-progress">
        <progress-icon :progress="contentProgress"/>
        <span v-if="isCompleted">{{ $tr('mastered') }}</span>
        <span v-else-if="isInProgress">{{ $tr('inProgress') }}</span>
        <span v-else>{{ $tr('notStarted') }}</span>
      </div>

      <div v-else class="summary-section-progress">
        {{ completionCount }}/{{ userCount }} {{ $tr('mastered') }}
      </div>

      <div class="summary-section-date">
        {{ $tr('lastActive') }}:
        <br>
        {{ lastActiveDate }}
      </div>

    </div>


    <!--VIDEO/AUDIO-->
    <div v-if="kind === (Kinds.VIDEO || Kinds.AUDIO)" class="summary-section-row">

      <div class="summary-section-details"></div>

      <div v-if="singleUser" class="summary-section-progress">
        <progress-icon :progress="contentProgress"/>

        <span v-if="(kind === Kinds.VIDEO)">
          <span v-if="isCompleted">{{ $tr('watched') }}</span>
          <span v-else-if="isInProgress">{{ $tr('inProgress') }}</span>
          <span v-else>{{ $tr('notWatched') }}</span>
        </span>

        <span v-if="(kind === Kinds.AUDIO)">
          <span v-if="isCompleted">{{ $tr('listened') }}</span>
          <span v-else-if="isInProgress">{{ $tr('inProgress') }}</span>
          <span v-else>{{ $tr('notListened') }}</span>
        </span>

      </div>


      <div v-else class="summary-section-progress">
        {{ completionCount }}/{{ userCount }}
        <span v-if="kind === Kinds.VIDEO">{{ $tr('watched') }}</span>
        <span v-else>{{ $tr('listened') }}</span>
      </div>

      <div class="summary-section-date">
        {{ $tr('lastActive') }}:
        <br>
        {{ lastActiveDate }}
      </div>

    </div>


    <!--DOCUMENTS-->
    <div v-if="kind === Kinds.DOCUMENT" class="summary-section-row">

      <div class="summary-section-details"></div>

      <div v-if="singleUser" class="summary-section-progress">
        <progress-icon :progress="contentProgress"/>
        <span v-if="isCompleted">{{ $tr('viewed') }}</span>
        <span v-else-if="isInProgress">{{ $tr('inProgress') }}</span>
        <span v-else>{{ $tr('notViewed') }}</span>
      </div>

      <div v-else class="summary-section-progress">
        {{ completionCount }}/{{ userCount }} {{ $tr('viewed') }}
      </div>

      <div class="summary-section-date">
        {{ $tr('lastActive') }}:
        <br>
        {{ lastActiveDate }}
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
      na: '-',
      exerciseProgress: 'Average Progress',
      contentProgress: 'Average Progress',
      exerciseCountText: '{count, number, integer} {count, plural, one {Exercise} other {Exercises}}',
      contentCountText:
        '{count, number, integer} {count, plural, one {Resource} other {Resources}}',
      mastered: 'Mastered',
      watched: 'Watched',
      listened: 'Listened',
      viewed: 'Viewed',
      inProgress: 'In Progress',
      notStarted: 'Not Started',
      notWatched: 'Not Watched',
      notListened: 'Not Listened',
      notViewed: 'Not Viewed',
    },
    components: {
      'progress-bar': require('kolibri.coreVue.components.progressBar'),
      'progress-icon': require('kolibri.coreVue.components.progressIcon'),
    },
    computed: {
      lastActiveDate() {
        if (this.lastActive) {
          return this.$tr('lastActiveText', [new Date(this.lastActive)]);
        }
        return '–';
      },
      Kinds() {
        return CoreConstants.ContentNodeKinds;
      },
      isInProgress() {
        return (this.contentProgress > 0) && (this.contentProgress < 1);
      },
      isCompleted() {
        return this.contentProgress === 1;
      },
    },
    props: {
      kind: {
        type: String,
        required: true,
      },
      exerciseCount: {
        type: Number,
        required: true,
      },
      exerciseProgress: {
        type: Number,
        required: false,
      },
      contentCount: {
        type: Number,
        required: true,
      },
      contentProgress: {
        type: Number,
        required: false,
      },
      lastActive: {
        type: String,
      },
      singleUser: {
        type: Boolean,
        required: true,
      },
      userCount: {
        type: Number,
        required: true,
      },
      completionCount: {
        type: Number,
        required: false,
      },
      isRecentView: {
        type: Boolean,
        required: true,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'
  @require '../reports.styl'

  .summary-section
    display: table
    width: 100%
    background-color: $core-bg-light

  .summary-section-row
    display: table-row

  .summary-section-details,
  .summary-section-progress,
  .summary-section-date
    display: table-cell
    vertical-align: top
    padding-bottom: 4px

  .summary-section-progress,
  .summary-section-date
    text-align: left

  .summary-section-progress
    width: $progress-col-width

  .summary-section-date
    width: $date-col-width

  .summary-section-heading
    text-align: left
    font-size: smaller
    color: $core-text-annotation

</style>
