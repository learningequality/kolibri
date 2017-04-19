<template>

  <div>
    <div class="wrapper">
      <content-icon :kind="kind" class="icon"/>
      <router-link v-if="isTopic" :to="topicLink">{{ title }}</router-link>
      <!--  TODO
      <router-link v-if="isUser" :to="userLink">{{ title }}</router-link>
       -->
      <router-link v-if="isExercise" :to="exerciseLink">{{ title }}</router-link>
      <span v-else>{{ title }}</span>
    </div>
    <div class="wrapper" v-if="isTopic">
      {{ $tr('exercises', {count: exerciseCount}) }} • {{ $tr('contents', {count: contentCount}) }}
    </div>
  </div>

</template>


<script>

  const CoachConstants = require('../../../constants');
  const CoreConstants = require('kolibri.coreVue.vuex.constants');

  module.exports = {
    $trNameSpace: 'itemName',
    $trs: {
      exercises: '{count, number, integer} {count, plural, one {Exercise} other {Exercises}}',
      contents: '{count, number, integer} {count, plural, one {Resource} other {Resources}}',
    },
    components: {
      'content-icon': require('kolibri.coreVue.components.contentIcon'),
    },
    props: {
      kind: {
        type: String,
        required: true,
      },
      title: {
        type: String,
        required: true,
      },
      id: {
        type: String,
        required: true,
      },
      exerciseCount: {
        type: Number,
      },
      contentCount: {
        type: Number,
      },
    },
    computed: {
      isTopic() {
        return this.kind === CoreConstants.ContentNodeKinds.TOPIC;
      },
      topicLink() {
        return {
          name: CoachConstants.PageNames.TOPIC_ITEM_LIST,
          params: {
            classId: this.pageState.classId,
            channelId: this.pageState.channelId,
            topicId: this.id,
          }
        };
      },
      isUser() {
        return this.kind === CoreConstants.USER;
      },
      userLink() {
        return {}; // TODO
      },
      isExercise() {
        return this.kind === CoreConstants.ContentNodeKinds.EXERCISE;
      },
      exerciseLink() {
        return {
          name: CoachConstants.PageNames.TOPIC_LEARNERS_FOR_ITEM,
          params: {
            classId: this.pageState.classId,
            channelId: this.pageState.channelId,
            contentId: this.id,
          }
        };
      },
    },
    vuex: {
      getters: {
        pageState: state => state.pageState,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  a
    font-size: 1.15em
    font-weight: bold

  .wrapper
    font-weight: normal
    position: relative
    text-align: left
    padding: 2px 0 0 25px
    color: $core-text-annotation

  .hasicon
    padding-left: 20px

  .icon
    position: absolute
    left: 0
    fill: $core-text-default
    font-size: 1.25em

</style>
