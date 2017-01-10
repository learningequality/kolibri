<template>

  <div class="summary-section">

    <!--TOPICS-->
    <div v-if="kind === Kinds.TOPIC" class="summary-section-row">

      <div class="summary-section-details"></div>

      <div class="summary-section-progress">
        <div class="summary-section-details">
          {{ $tr('exerciseCountText', {count: exercisecount}) }}
        </div>
        <div class="summary-section-heading">{{ $tr('exerciseProgress') }}</div>
        <progress-bar v-if="exerciseprogress !== undefined" :progress="exerciseprogress"></progress-bar>
        <div v-else>{{ $tr('na') }}</div>
      </div>

      <div class="summary-section-progress">
        <div class="summary-section-details">
          {{ $tr('contentCountText', {count: contentcount}) }}
        </div>
        <div class="summary-section-heading">{{ $tr('contentProgress') }}</div>
        <progress-bar v-if="contentprogress !== undefined" :progress="contentprogress"></progress-bar>
        <div v-else>{{ $tr('na') }}</div>
      </div>

      <div v-if="!isrecentview" class="summary-section-date">
        <div class="summary-section-details">{{ $tr('lastActive') }}:</div>
        {{ lastActiveDate }}
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
        {{ completioncount }}/{{ usercount }} {{ $tr('mastered') }}
      </div>

      <div class="summary-section-date">
        {{ $tr('lastActive') }}:
        <br>
        {{ lastActiveDate }}
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
        {{ completioncount }}/{{ usercount }}
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
      <div class="summary-section-details">

      </div>

      <div v-if="singleuser" class="summary-section-progress">
        <progress-icon :progress="contentprogress" :kind="kind" :showtext="true"></progress-icon>
      </div>

      <div v-else class="summary-section-progress">
        {{ completioncount }}/{{ usercount }} {{ $tr('viewed') }}
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
      usercount: {
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
