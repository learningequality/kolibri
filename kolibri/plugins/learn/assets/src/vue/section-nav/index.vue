<template>

  <div>
    <div class="link-block">
      <router-link v-if="!isLearn" :to="learnRootLink">{{ $tr('learnName') }}</router-link>
      <span v-else>{{ $tr('learnName') }}</span>
    </div>
    <div class="link-block">
      <router-link v-if="isLearn" :to="exploreRootLink">{{ $tr('exploreName') }}</router-link>
      <span v-else>{{ $tr('exploreName') }}</span>
    </div>
  </div>

</template>


<script>

  const PageNames = require('../../state/constants').PageNames;
  const PageModes = require('../../state/constants').PageModes;
  const getters = require('../../state/getters');

  module.exports = {
    $trNameSpace: 'sectionNav',
    $trs: {
      learnName: 'Recommended',
      exploreName: 'Topics',
    },
    computed: {
      learnRootLink() {
        return {
          name: PageNames.LEARN_CHANNEL,
          channel_id: this.currentChannelId,
        };
      },
      exploreRootLink() {
        return {
          name: PageNames.EXPLORE_CHANNEL,
          channel_id: this.currentChannelId,
        };
      },
      isLearn() {
        return this.pageMode === PageModes.LEARN;
      },
    },
    vuex: {
      getters: {
        pageMode: getters.pageMode,
        currentChannelId: state => state.core.channels.currentId,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .link-block
    display: inline-block
    padding: 16px

</style>
