<template>

  <section class="content-carousel">

    <div class="content-carousel-details">
      <header v-if="header" class="content-carousel-details-header">
        <h2> {{header}} </h2>
        <span v-if="subheader"> {{subheader}} </span>
      </header>

      <icon-button
        :text="$tr('viewAllButtonLabel')"
        v-if="showViewAll"
        @click="$emit('viewAllClicked')"
        class="content-carousel-details-view-all" />
    </div>


    <div class="content-carousel-set">

        <div :style="widthOfCarousel" class="content-carousel-cards">
          <transition-group
            :name="animation"
            :duration="500"
            tag="div"
            @before-enter="enterStyleStart"
            @leave="leaveStyleStart"
            @after-leave="leaveStyleEnd"
            @enter="enterStyleEnd">

            <slot
              v-for="content in contentSet"
              :title="content.title"
              :thumbnail="content.thumnail"
              :kind="content.kind"
              :progress="content.progress"
              :id="content.id">

                <!-- uses props if scoped slot is unused -->
                <content-card
                  class="content-card"
                  :key="content.id"
                  :title="content.title"
                  :thumbnail="content.thumbnail"
                  :kind="content.kind"
                  :progress="content.progress"
                  :link="genLink(content.id, content.kind)"/>

            </slot>

          </transition-group>
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
      showViewAll: {
        type: Boolean,
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
        contentSetStartIndex: 0,
        controlCounter: 0,
        animation: 'next',
      };
    },
    computed: {
      contentSetSize() {
        return Math.floor(this.elSize.width / contentCardWidth);
      },
      nextContentSetStartIndex() {
        return this.contentSetStartIndex + this.contentSetSize;
      },
      contentSetEndIndex() {
        return this.nextContentSetStartIndex - 1;
      },
      contentSet() {
        return this.contents.slice(this.contentSetStartIndex, this.nextContentSetStartIndex);
      },
      isFirstSet() {
        return this.contentSetStartIndex === 0;
      },
      isLastSet() {
        return this.contentSetEndIndex === (this.contents.length - 1);
      },
      widthOfCarousel() {
        // maintains the width of the carousel at fixed width relative to parent for animation
        return {
          // 'width': `${contentCardWidth * this.contentSetSize * 2}px`,
          // 'transform': `translateX(-50%)`,
          'min-width': `${contentCardWidth}px`,
        };
      },
    },
    methods: {
      enterStyleStart(el, done) {
        const sign = this.animation === 'next' ? '' : '-';
        el.style.transform = `translateX(${sign}${this.contentSetSize * contentCardWidth}px)`;
      },
      enterStyleEnd(el, done) {
        el.style.transform = '';
        done();
      },
      leaveStyleStart(el, done) {
        const sign = this.animation === 'next' ? '-' : '';
        el.style.transform = `translateX(${sign}${this.contentSetSize * contentCardWidth}px)`;
        el.style.display = 'block';
        el.style.position = 'absolute';
        setTimeout(done, 500);
      },
      leaveStyleEnd(el) {
      },
      nextSet() {
        const lastIndex = this.contents.length - 1;

        this.controlCounter += 1;

        const nextEndIndex = (this.nextContentSetStartIndex + this.contentSetSize) - 1;
        if (nextEndIndex > lastIndex) {
          this.contentSetStartIndex = this.contents.length - this.contentSetSize;
        } else {
          this.contentSetStartIndex = this.nextContentSetStartIndex;
        }

        this.animation = 'next';
      },
      previousSet() {
        this.controlCounter += 1;

        const prevStartIndex = this.contentSetStartIndex - this.contentSetSize;
        if (prevStartIndex < 0) {
          this.contentSetStartIndex = 0;
        } else {
          this.contentSetStartIndex = prevStartIndex;
        }

        this.animation = 'previous';
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  $card-height = 210px

  .content-carousel
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

    &-controls
      position: relative
      top: -($card-height / 2)
      clearfix()
      .next, .previous
        position: relative
        transform: translateY(-50%)
      .next
        float: right
      .previous
        float: left

    &-set
      width: 100%

    &-cards
      margin-left: auto
      margin-right: auto
      // text-align:center

  .content-card
    transition: all 0.5s ease

  // // Applies to both 'next' animation and previous' animation
  // .next, .previous
  //   // setting the animation for seamless movements
  //   &-enter-active, &-leave-active
  //     transition: all 5s linear
  //   // set leave to absolute so that the elements can overlap while they're animating
    // &-leave-active
    //   position: absolute
  //     opacity: 0

</style>
