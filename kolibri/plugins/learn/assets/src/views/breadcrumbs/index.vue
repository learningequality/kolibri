<template>

  <breadcrumbs v-if="inLearn" :items="learnBreadcrumbs"/>
  <breadcrumbs v-else-if="inExplore" :items="exploreBreadcrumbs"/>

</template>


<script>

  const PageNames = require('../../constants').PageNames;
  const PageModes = require('../../constants').PageModes;
  const getters = require('../../state/getters');
  const { getCurrentChannelObject } = require('kolibri.coreVue.vuex.getters');

  module.exports = {
    $trNameSpace: 'learnBreadcrumbs',
    $trs: {
      recommended: 'Recommended',
    },
    components: {
      breadcrumbs: require('kolibri.coreVue.components.breadcrumbs'),
    },
    computed: {
      inLearn() {
        return this.pageMode === PageModes.LEARN;
      },
      learnRootLink() {
        return {
          name: PageNames.LEARN_CHANNEL,
          channel_id: this.channelId,
        };
      },
      learnBreadcrumbs() {
        const crumbs = [{ text: this.$tr('recommended'), link: this.learnRootLink }];
        if (this.pageName === PageNames.LEARN_CONTENT) {
          crumbs.push({ text: this.contentTitle });
        }
        return crumbs;
      },
      inExplore() {
        return this.pageMode === PageModes.EXPLORE;
      },
      inExploreRoot() {
        return this.pageName === PageNames.EXPLORE_CHANNEL;
      },
      exploreRootLink() {
        return {
          name: PageNames.EXPLORE_CHANNEL,
          channel_id: this.channelId,
        };
      },
      exploreBreadcrumbs() {
        const crumbs = [{ text: this.channelTitle, link: this.exploreRootLink }];
        if (this.pageName === PageNames.EXPLORE_CONTENT) {
          this.contentCrumbs.forEach(
            crumb => crumbs.push({ text: crumb.title, link: this.topicLink(crumb.id) })
          );
          crumbs.push({ text: this.contentTitle });
        } else {
          this.topicCrumbs.forEach(
            crumb => crumbs.push({ text: crumb.title, link: this.topicLink(crumb.id) })
          );
          if (!this.inExploreRoot) {
            crumbs.push({ text: this.topicTitle });
          }
        }
        return crumbs;
      },
    },
    methods: {
      topicLink(topicId) {
        return {
          name: PageNames.EXPLORE_TOPIC,
          params: {
            channel_id: this.channelId,
            id: topicId,
          },
        };
      },
    },
    vuex: {
      getters: {
        pageName: state => state.pageName,
        pageMode: getters.pageMode,
        channelId: state => getCurrentChannelObject(state).id,
        channelTitle: state => getCurrentChannelObject(state).title,
        topicTitle: state => state.pageState.topic.title,
        topicCrumbs: state => (state.pageState.topic || {}).breadcrumbs || [],
        contentTitle: state => state.pageState.content.title,
        contentCrumbs: state => (state.pageState.content || {}).breadcrumbs || [],
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
