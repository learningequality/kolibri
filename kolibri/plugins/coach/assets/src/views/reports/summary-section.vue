<template>

  <div>

    <!--TOPICS-->
    <div v-if="kind === Kinds.TOPIC">
      <ul>
        <li>{{ $tr('exerciseCountText', {count: exerciseCount}) }}</li>
        <li>{{ $tr('contentCountText', {count: contentCount}) }}</li>
      </ul>
    </div>


    <!--EXERCISES-->
    <!--
    <div v-if="kind === Kinds.EXERCISE">
      (mastery requirement)
    </div>
    -->


    <!--VIDEO/AUDIO-->
    <div v-if="kind === (Kinds.VIDEO || Kinds.AUDIO)">

      <div v-if="singleUser">
        <progress-icon :progress="contentProgress" />

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


      <div v-else>
        {{ completionCount }}/{{ userCount }}
        <span v-if="kind === Kinds.VIDEO">{{ $tr('watched') }}</span>
        <span v-else>{{ $tr('listened') }}</span>
      </div>

    </div>


    <!--DOCUMENTS-->
    <div v-if="kind === Kinds.DOCUMENT">

      <div v-if="singleUser">
        <progress-icon :progress="contentProgress" />
        <span v-if="isCompleted">{{ $tr('viewed') }}</span>
        <span v-else-if="isInProgress">{{ $tr('inProgress') }}</span>
        <span v-else>{{ $tr('notViewed') }}</span>
      </div>

      <div v-else>
        {{ completionCount }}/{{ userCount }} {{ $tr('viewed') }}
      </div>

    </div>

  </div>

</template>


<script>

  import * as CoreConstants from 'kolibri.coreVue.vuex.constants';
  import progressBar from 'kolibri.coreVue.components.progressBar';
  import progressIcon from 'kolibri.coreVue.components.progressIcon';
  export default {
    name: 'reportSummary',
    $trs: {
      lastActive: 'Last active',
      lastActiveText: '{0, date, medium}',
      na: '-',
      exerciseCountText: '{count, number, integer} {count, plural, one {Exercise} other {Exercises}}',
      contentCountText: '{count, number, integer} {count, plural, one {Resource} other {Resources}}',
      mastered: 'Completed',
      watched: 'Watched',
      listened: 'Listened',
      viewed: 'Viewed',
      inProgress: 'In progress',
      notStarted: 'Not started',
      notWatched: 'Not watched',
      notListened: 'Not listened',
      notViewed: 'Not viewed',
    },
    components: {
      progressBar,
      progressIcon,
    },
    computed: {
      lastActiveDate() {
        if (this.lastActive) {
          return this.$tr('lastActiveText', [new Date(this.lastActive)]);
        }
        return '\u2013';
      },
      Kinds() {
        return CoreConstants.ContentNodeKinds;
      },
      isInProgress() {
        return this.contentProgress > 0 && this.contentProgress < 1;
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

  @require '~kolibri.styles.definitions'

</style>
