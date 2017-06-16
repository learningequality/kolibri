<template>

  <section class="content-carousel">

    <div class="content-carousel-details">
      <header v-if="header" class="content-carousel-details-header">
        <h2> {{header}} </h2>
        <span v-if="subheader"> {{subheader}} </span>
      </header>
    </div>

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

    <div :style="widthOfCarousel" class="content-carousel-set">
        <transition-group @leave="leaveTest">

          <div class="content-card"
            v-for="(content, index) in contents"
            v-if="isInThisSet(index)"
            :style="positionCalc(index)"
            :key="content.id">
            <!-- uses props if scoped slot is unused -->
              <slot
                :title="content.title"
                :thumbnail="content.thumnail"
                :kind="content.kind"
                :progress="content.progress"
                :id="content.id">

                <content-card
                :title="content.title"
                :thumbnail="content.thumbnail"
                :kind="content.kind"
                :progress="content.progress"
                :link="genLink(content.id, content.kind)"/>
              </slot>
          </div>

        </transition-group>
    </div>

  </section>

</template>


<script>

  const responsiveElement = require('kolibri.coreVue.mixins.responsiveElement');
  const validateLinkObject = require('kolibri.utils.validateLinkObject');

  // body width + L margin + R margin
  const contentCardWidth = 210 + (10 * 2);

  module.exports = {
    mixins: [responsiveElement],
    $trNameSpace: 'contentCardCarousel',
    $trs: {
      viewAllButtonLabel: 'View all'
    },
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
      'icon-button': require('kolibri.coreVue.components.iconButton'),
      'ui-icon-button': require('keen-ui/src/UiIconButton'),
      'content-card': require('../content-card'),
    },
    data() {
      return {
        contentSetStart: 0,
        contentSetEnd: null,
      };
    },
    mounted() {
      // mixin isn't present until mounted
      this.contentSetEnd = this.contentSetSize - 1;
    },
    watch: {
      contentSetStart(startIndex) {
        if (startIndex < 0) {
          this.contentSetStart = 0;
          this.contentSetEnd = this.contentSetSize - 1;
        }
      },
      contentSetEnd(endIndex) {
        if (endIndex >= this.contents.length) {
          this.contentSetEnd = this.contents.length - 1;
          this.contentSetStart = this.contents.length - this.contentSetSize;
        }
      },
    },
    computed: {
      contentSetSize() {
        return Math.floor(this.elSize.width / contentCardWidth);
      },
      isFirstSet() {
        return this.contentSetStart === 0;
      },
      isLastSet() {
        return this.contentSetEnd === this.contents.length;
      },
      widthOfCarousel() {
        // maintains the width of the carousel at fixed width relative to parent for animation
        return {
          'width': `${2 * this.contentSetSize * contentCardWidth}px`,
          'min-width': `${contentCardWidth}px`,
        };
      },
    },
    methods: {
      positionCalc(index) {
        const cardOffset = (index - this.contentSetStart) * contentCardWidth;
        return {
          left: `${cardOffset}px`
        };
      },
      leaveTest(el) {
        const restingPosition = parseInt(el.style.left, 10);
        console.log(restingPosition);
        el.style.left = `${restingPosition * -1}px`;
      },
      isInThisSet(index) {
        return this.contentSetStart <= index && index < this.contentSetEnd;
      },
      nextSet() {
        this.contentSetStart += this.contentSetSize;
        this.contentSetEnd += this.contentSetSize;
      },
      previousSet() {
        this.contentSetStart -= this.contentSetSize;
        this.contentSetEnd -= this.contentSetSize;
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  $card-height = 210px

  .content-carousel
    margin-top: 1em
    margin-bottom: 1em
    clearfix()

    &-details
      clearfix()
      &-header
        float: left
        text-align: left
        margin-bottom: 1em
        h2
          margin: 0
      &-view-all
        float: right
        color: white
        background-color: $core-action-normal

    &-set
      margin-left: auto
      margin-right: auto
      position: relative
      height: $card-height

    &-controls
      // set up the parent element that the buttons use for reference
      position: absolute
      width: 100%
      clearfix()
      .next, .previous
        // uses parent div as reference
        position: absolute
        top: ($card-height / 2)

        // using material definition for resting Raised Button
        z-index: 2
        box-shadow: 0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)
        &:active
          z-index: 8
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)
      .next
        right: 0
      .previous
        left: 0

  .content-card, .next-enter
    transition: all 5s ease
    position: absolute

</style>
