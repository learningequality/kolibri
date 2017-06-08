<template>

  <section class="content-carousel">

    <header v-if="header" class="content-carousel-header">
      <h2> {{header}} </h2>
      <span v-if="subheader"> {{subheader}} </span>
    </header>

    <div class="content-carousel-set">

      <transition :name="animation">
        <div :key="currentSetIndex" :style="widthOfCarousel" class="content-carousel-cards">
          <slot
            v-for="content in contentSets[currentSetIndex]"
            :title="content.title"
            :thumbnail="content.thumnail"
            :kind="content.kind"
            :progress="content.progress"
            :id="content.id">

              <!-- uses props if scoped slot is unused -->
              <content-card
                :title="content.title"
                :thumbnail="content.thumbnail"
                :kind="content.kind"
                :progress="content.progress"
                :link="genLink(content.id, content.kind)"/>

          </slot>

        </div>
      </transition>

      <div class="content-carousel-controls">
        <ui-icon-button
          v-if="!isFirstSet"
          icon="arrow_back"
          size="large"
          class="previous"
          @click="previousSet" />
        <ui-icon-button
          v-if="!isLastSet"
          icon="arrow_forward"
          size="large"
          class="next" @click="nextSet" />
      </div>

    </div>
  </section>

</template>


<script>

  const chunk = require('lodash/chunk');
  const responsiveElement = require('kolibri.coreVue.mixins.responsiveElement');
  const validateLinkObject = require('kolibri.utils.validateLinkObject');

  // body width + L margin + R margin
  const contentCardWidth = 210 + (10 * 2);

  module.exports = {
    mixins: [responsiveElement],
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
      genLink: {
        type: Function,
        validator(value) {
          return validateLinkObject(value(1, 'exercise'));
        },
      },
    },
    components: {
      'ui-icon-button': require('keen-ui/src/UiIconButton'),
      'content-card': require('../content-card'),
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

        // in case screen expands while rendered
        if (this.currentSetIndex && this.currentSetIndex >= contentSetsArray.length) {
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
        return Math.floor(this.elSize.width / contentCardWidth);
      },
      widthOfCarousel() {
        // maintains the width of the carousel at fixed width relative to parent for animation
        return {
          'width': `${contentCardWidth * this.contentSetSize}px`,
          'min-width': `${contentCardWidth}px`,
        };
      },
    },
    methods: {
      nextSet() {
        this.currentSetIndex += 1;
        this.animation = 'next';
      },
      previousSet() {
        this.currentSetIndex -= 1;
        this.animation = 'previous';
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  $card-height = 210px

  .content-carousel
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
