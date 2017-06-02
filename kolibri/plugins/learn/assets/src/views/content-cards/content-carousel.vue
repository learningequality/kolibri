<template>

  <div>
    <icon-button @click="currentSet--" :disabled="isFirstSet">
      <mat-svg category="hardware" name="keyboard_arrow_left"/>
    </icon-button>
    <icon-button @click="currentSet++" :disabled="isLastSet">
      <mat-svg category="hardware" name="keyboard_arrow_right"/>
    </icon-button>

    <transition
      v-for="(contentSet, setIndex) in contentSets"
      v-if="isCurrentSet(setIndex)"
      name="turnPage">

      <div class="content-set">
        <content-card
        v-for="content in contentSet"
        :title="content.title"
        :thumbnail="content.thumbnail"
        :kind="content.kind"
        :progress="content.progress"
        :link="genContentLink(content.id)"/>
      </div>

    </transition>

  </div>

</template>


<script>

  const PageNames = require('../../constants').PageNames;
  const chunk = require('lodash/chunk');
  // use window for reference for now. Could use element later
  const responsiveWindow = require('kolibri.coreVue.mixins.responsiveWindow');

  module.exports = {
    $trNameSpace: 'Content Carousel Strip',
    $trs: {
      defaultTitle: 'Contents',
    },
    mixins: [responsiveWindow],
    props: {
      contents: {
        type: Array,
        default: () => [],
      },
    },
    components: {
      'icon-button': require('kolibri.coreVue.components.iconButton'),
      'content-card': require('./content-card'),
    },
    data() {
      return {
        currentSet: 0,
      };
    },
    computed: {
      contentSets() {
        return chunk(this.contents, this.contentSetSize);
      },
      isFirstSet() {
        return this.currentSet === 0;
      },
      isLastSet() {
        return this.currentSet === (this.contentSets.length - 1);
      },
      contentSetSize() {
        // we can calculate these based off of the size of the cards later
        switch (this.windowSize.breakpoint) {
          case 0:
            return 1;
          case 1:
            return 2;
          case 2:
            return 2;
          case 3:
            return 3;
          case 4:
            return 3;
          case 5:
            return 4;
          default:
            return 6;
        }
      },
    },
    methods: {
      isCurrentSet(setIndex) {
        return setIndex === this.currentSet;
      },
      genContentLink(id) {
        return {
          name: PageNames.LEARN_CONTENT,
          params: { channel_id: this.channelId, id },
        };
      },
    },
    vuex: {
      getters: {
        channelId: (state) => state.core.channels.currentId,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .button-wrapper
    text-align: center
    margin-top: 1em

</style>
