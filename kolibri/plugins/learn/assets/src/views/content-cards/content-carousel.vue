<template>

  <section class="content-carousel">

    <header v-if="header" class="content-carousel-header">
      <h2> {{header}} </h2>
      <span v-if="subheader"> {{subheader}} </span>
    </header>

    <div class="content-carousel-set">
      <transition :name="animation">
        <div :key="currentSetIndex" class="content-carousel-cards" :style="widthOfCarousel">
          <content-card
            v-for="content in contentSets[currentSetIndex]"
            class="content-card"
            :title="content.title"
            :thumbnail="content.thumbnail"
            :kind="content.kind"
            :progress="content.progress"
            :link="genContentLink(content.id)"/>
        </div>
      </transition>

      <div class="content-carousel-controls">
        <icon-button class="previous" @click="previousSet" v-if="!isFirstSet">
          <mat-svg category="hardware" name="keyboard_arrow_left"/>
        </icon-button>
        <icon-button class="next" @click="nextSet" v-if="!isLastSet">
          <mat-svg category="hardware" name="keyboard_arrow_right"/>
        </icon-button>
      </div>

    </div>
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
        currentSetIndex: 0,
        animation: 'next',
      };
    },
    computed: {
      contentSets() {
        const contentSetsArray = chunk(this.contents, this.contentSetSize);
        if (this.currentSetIndex >= contentSetsArray.length) {
          this.currentSetIndex = contentSetsArray.length - 1;
        }
        return contentSetsArray;
      },
      isFirstSet() {
        return this.currentSetIndex === 0;
      },
      isLastSet() {
        return this.currentSetIndex === (this.contentSets.length - 1);
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
      genContentLink(id) {
        return {
          name: PageNames.LEARN_CONTENT,
          params: { channel_id: this.channelId, id },
        };
      },
      nextSet() {
        this.currentSetIndex += 1;
        this.animation = 'next';
      },
      previousSet() {
        this.currentSetIndex -= 1;
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
  $card-height = 210px

  .content-carousel
    // position: absolute
    &-header
      text-align: left
      margin-bottom: 1em
      h2
        margin: 0
    &-controls
      position: relative
      top: -($card-height / 2)
      clearfix()
      .next, .previous
        position: relative
      .next
        float: right
      .previous
        float: left

    &-cards
      margin-left: auto
      margin-right: auto

  .content-card
    margin-right: $card-gutter
    margin-left: $card-gutter

  // Applies to both 'next' animation and previous' animation
  .next, .previous
    // setting the animation for seamless movements
    &-enter-active, &-leave-active
      transition: all 0.5s linear
    // set leave to absolute so that the elements can overlap while they're animating
    &-leave-active
      position: absolute
      opacity: 0

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
