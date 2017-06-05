<template>

  <section class="content-carousel">

    <div class="pure-g">
      <header class="pure-u-1-2 content-carousel-header">
        <h2 v-if="header"> {{header}} </h2>
        <sub v-if="subheader"> {{subheader}} </sub>
      </header>

      <div class="pure-u-1-2 content-carousel-controls">
        <icon-button @click="previousSet" :disabled="isFirstSet">
          <mat-svg category="hardware" name="keyboard_arrow_left"/>
        </icon-button>
        <icon-button @click="nextSet" :disabled="isLastSet">
          <mat-svg category="hardware" name="keyboard_arrow_right"/>
        </icon-button>
      </div>
    </div>

    <transition :name="animation">

      <div :key="currentSet" :style="widthOfCarousel" class="content-set">
        <content-card
        v-for="content in contentSets[currentSet]"
        class="content-card"
        :title="content.title"
        :thumbnail="content.thumbnail"
        :kind="content.kind"
        :progress="content.progress"
        :link="genContentLink(content.id)"/>
      </div>

    </transition>

  </section>

</template>


<script>

  const PageNames = require('../../constants').PageNames;
  const chunk = require('lodash/chunk');
  // use window for reference for now. Could use element later
  const responsiveWindow = require('kolibri.coreVue.mixins.responsiveWindow');

  module.exports = {
    mixins: [responsiveWindow],
    props: {
      contents: {
        type: Array,
        required: true,
      },
      header: {
        type: String,
      },
      subheader: {
        type: String,
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
            return 4;
          case 5:
            return 4;
          case 6:
            return 5;
          default:
            return 6;
        }
      },
      widthOfCarousel() {
        const cardWidth = 210;
        const cardMargin = 10;

        const cardGutterWidth = cardMargin * 2;
        const allGuttersWidth = this.contentSetSize * cardGutterWidth;
        const allCardsWidth = this.contentSetSize * cardWidth;

        return {
          width: `${allGuttersWidth + allCardsWidth}px`,
        };
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

  $card-gutter = 10px

  .content-card
    margin-right: $card-gutter
    margin-left: $card-gutter
    &:first-child
      margin-left: 0
    &:last-child
      margin-right: 0

  .content-carousel
    &-header, &-controls
      margin-top: 1em
    &-header
      text-align: left
      h2
        margin: 0
    &-controls
      text-align: right

  // Applies to both 'next' animation and previous' animation
  .next, .previous
    // setting the animation for seamless movements
    &-enter-active, &-leave-active
      transition: transform 0.5s linear
    // set leave to absolute so that the elements can overlap while they're animating
    &-leave-active
      position: absolute

  // 'next' animation specific styles
  .next
    // set starting point for incoming content sets
    &-enter
      transform: translateX(100%)
    // set ending point for outgoing content set
    &-leave-active
      transform: translateX(-100%)

  // 'previous' animation specific styles
  .previous
    // set starting point for incoming content sets
    &-enter
      transform: translateX(-100%)
    // set ending point for outgoing content sets
    &-leave-active
      transform: translateX(100%)

</style>
