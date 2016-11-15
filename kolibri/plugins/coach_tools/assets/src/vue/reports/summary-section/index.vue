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
      <p>Last Active: {{ lastActiveText }}</p>
      <div v-if="singleuser">
        <!--TODO: Should just be one of the 3 progress states.-->
        [Insert progress icon]
      </div>
      <div v-else>
        [Insert progress icon]
        {{ userscompleted }} out of {{ numusers }} Mastered
      </div>
    </div>

    <!--VIDEO/AUDIO-->
    <div v-if="kind === (Kinds.VIDEO || Kinds.AUDIO)">
      <p>Last Active: {{ lastActiveText }}</p>
      <div v-if="singleuser">
        <!--TODO: Should just be one of the 3 progress states.-->
        [Insert progress icon]
      </div>
      <div v-else>
        [Insert progress icon]
        {{ userscompleted }} out of {{ numusers }} Finished Watching/Listening
      </div>
    </div>

    <!--DOCUMENT-->
    <div v-if="kind === Kinds.DOCUMENT">
      <p>Last Active: {{ lastActiveText }}</p>
      <div v-if="singleuser">
        <!--TODO: Should just be one of the 2 progress states, viewed or not.-->
        [Insert progress icon]
      </div>
      <div v-else>
        [Insert progress icon]
        {{ userscompleted }} out of {{ numusers }} Viewed
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
