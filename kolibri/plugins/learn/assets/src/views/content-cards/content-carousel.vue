<template>

  <div>
    <icon-button @click="previousSet" :disabled="isFirstSet">
      <mat-svg category="hardware" name="keyboard_arrow_left"/>
    </icon-button>
    <icon-button @click="nextSet" :disabled="isLastSet">
      <mat-svg category="hardware" name="keyboard_arrow_right"/>
    </icon-button>

    <transition mode="out-in" :name="animation">

      <div :key="currentSet" class="content-set">
        <content-card
        v-for="content in contentSets[currentSet]"
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
        animation: 'next',
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
      isCurrentSet(index) {
        return index === this.currentSet;
      },
      genContentLink(id) {
        return {
          name: PageNames.LEARN_CONTENT,
          params: { channel_id: this.channelId, id },
        };
      },
      nextSet() {
        this.currentSet += 1;
        this.animation = 'next';
      },
      previousSet() {
        this.currentSet -= 1;
        this.animation = 'previous';
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

  .next-enter, .previous-enter
    opacity: 0.2


  .next-enter-active, .previous-enter-active
    transition: opacity 0.3s ease-in


  .next-leave-active, .previous-leave-active
    transition: opacity 0.3s linear, transform 0.4s ease-out
    opacity: 0

  .next-leave-active
    transform: translateX(-200px)

  .previous-leave-active
    transform: translateX(200px)

</style>
