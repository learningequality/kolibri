<template>

  <div class="summary-section">

    <!--TOPICS-->
    <div v-if="kind === Kinds.TOPIC">
      <p>{{ exercisecount }} {{ $tr('exercises') }} - {{ contentcount }} {{ $tr('content') }} {{ $tr('items') }}</p>
      <p>{{ $tr('lastActive') }}: {{ lastActiveDate }}</p>

      <div>
        <p>{{ $tr('exercises') }}</p>
        <progress-bar v-if="exerciseprogress !== undefined" :progress="exerciseprogress"></progress-bar>
        <span v-else>{{ $tr('na') }}</span>
      </div>

      <div>
        <p>{{ $tr('content') }}</p>
        <progress-bar v-if="contentprogress !== undefined" :progress="contentprogress"></progress-bar>
        <span v-else>{{ $tr('na') }}</span>
      </div>
    </div>


    <!--EXERCISES-->
    <div v-if="kind === Kinds.EXERCISE">
      <p>{{ $tr('lastActive') }}: {{ lastActiveDate }}</p>

      <div v-if="singleuser">
        <progress-icon :progress="1" :kind="kind" :showtext="true"></progress-icon>
      </div>

      <div v-else>
        {{ userscompleted }}/{{ numusers }} {{ $tr('mastered') }}
      </div>
    </div>


    <!--VIDEO/AUDIO-->
    <div v-if="kind === (Kinds.VIDEO || Kinds.AUDIO)">
      <p>{{ $tr('lastActive') }}: {{ lastActiveDate }}</p>

      <div v-if="singleuser">
        <progress-icon :progress="contentprogress" :kind="kind" :showtext="true"></progress-icon>
      </div>

      <div v-else>
        {{ userscompleted }}/{{ numusers }}
        <span v-if="kind === Kinds.VIDEO">{{ $tr('watched') }}</span>
        <span v-else>{{ $tr('listened') }}</span>
      </div>
    </div>


    <!--DOCUMENTS-->
    <div v-if="kind === Kinds.DOCUMENT">
      <p>{{ $tr('lastActive') }}: {{ lastActiveDate }}</p>

      <div v-if="singleuser">
        <progress-icon :progress="contentprogress" :kind="kind" :showtext="true"></progress-icon>
      </div>

      <div v-else>
        {{ userscompleted }}/{{ numusers }} {{ $tr('viewed') }}
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
      lastActiveDate: '{0, date, medium}',
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
          return this.$tr('lastActiveDate', new Date(this.lastactive));
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
      userscompleted: {
        type: Number,
        required: false,
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
