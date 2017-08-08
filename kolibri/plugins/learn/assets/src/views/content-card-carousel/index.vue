<template>

  <section class="content-carousel">

    <div class="content-carousel-details">
      <header v-if="header" class="content-carousel-details-header">
        <h2> {{header}} </h2>
        <span v-if="subheader"> {{subheader}} </span>
      </header>
    </div>

    <div :style="widthOfCarousel" class="content-carousel-controls">
      <div class="previous" @click="previousSet">
        <ui-icon-button
          class="previous-button"
          v-show="!isFirstSet"
          :disabled="isFirstSet"
          :disable-ripple="true"
          icon="arrow_back"
          size="large"
        />
      </div>

      <div class="next" @click="nextSet">
        <ui-icon-button
          class="next-button"
          v-show="!isLastSet"
          :disabled="isLastSet"
          :disable-ripple="true"
          icon="arrow_forward"
          size="large"
        />
      </div>
    </div>

    <transition-group
      :style="widthOfCarousel"
      class="content-carousel-set"
      tag="div"
      @leave="slide"
      @before-enter="setStartPosition"
      @enter="slide">

      <div class="content-carousel-card"
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

  </section>

</template>


<script>

  import responsiveElement from 'kolibri.coreVue.mixins.responsiveElement';
  import validateLinkObject from 'kolibri.utils.validateLinkObject';
  import iconButton from 'kolibri.coreVue.components.iconButton';
  import uiIconButton from 'keen-ui/src/UiIconButton';
  import contentCard from '../content-card';

  const contentCardWidth = 210;
  const gutterWidth = 20;

  export default {
    name: 'contentCardCarousel',
    mixins: [responsiveElement],
    $trs: { viewAllButtonLabel: 'View all' },
    props: {
      contents: {
        type: Array,
        required: true,
      },
      header: { type: String },
      subheader: { type: String },
      genLink: {
        type: Function,
        validator(value) {
          const dummyExercise = value(1, 'exercise');
          const isValidLinkGenerator = validateLinkObject(dummyExercise);
          return isValidLinkGenerator;
        },
      },
    },
    components: {
      iconButton,
      uiIconButton,
      contentCard,
    },
    data() {
      return {
        // flag marks holds the index (in contents array, prop) of first item in carousel
        contentSetStart: 0,
        // flag that marks when the slide animation will be going start at left
        leftToRight: false,
        // tracks whether the carousel has been interacted with
        interacted: false,
      };
    },
    watch: {
      // ensures that indeces in contentSetStart/End are within bounds of the contents
      contentSetStart(newStartIndex, oldStartIndex) {
        const nextSet = newStartIndex > oldStartIndex;
        const previousSet = newStartIndex < oldStartIndex;
        const newIndexTooLarge = this.contentSetEnd >= this.contents.length;
        const newIndexTooSmall = newStartIndex < 0;
        const enoughContentForASet = this.contents.length >= this.contentSetSize;

        // turns animation on in case this is the first time it's been updated
        if (!this.interacted) {
          this.interacted = true;
        }

        if (nextSet && newIndexTooLarge && enoughContentForASet) {
          this.contentSetStart = this.contents.length - this.contentSetSize;
        } else if (previousSet && newIndexTooSmall) {
          this.contentSetStart = 0;
        }
      },
      // ensures that carousel correctly readjusts # of cards if resize occurs at end of contents
      contentSetSize(newSetSize, oldSetSize) {
        const addingCards = newSetSize > oldSetSize;
        const removingCards = oldSetSize > newSetSize;
        this.leftToRight = removingCards;
        if (this.isLastSet && addingCards) {
          this.contentSetStart = this.contents.length - this.contentSetSize;
          this.leftToRight = true;
        }
      },
    },
    computed: {
      contentSetSize() {
        if (this.elSize.width > 2 * contentCardWidth) {
          const numOfCards = Math.floor(this.elSize.width / contentCardWidth);
          const numOfGutters = numOfCards - 1;
          const totalWidth = numOfCards * contentCardWidth + numOfGutters * gutterWidth;
          if (this.elSize.width >= totalWidth) {
            return numOfCards;
          }
          return numOfCards - 1;
        }
        return 1;
      },
      contentSetEnd() {
        return this.contentSetStart + (this.contentSetSize - 1);
      },
      isFirstSet() {
        return this.contentSetStart === 0;
      },
      isLastSet() {
        return this.contentSetEnd >= this.contents.length - 1;
      },
      widthOfCarousel() {
        const cards = this.contentSetSize * contentCardWidth;
        const gutters = (this.contentSetSize - 1) * gutterWidth;
        return {
          width: `${cards + gutters}px`,
          'min-width': `${contentCardWidth}px`,
        };
      },
    },
    methods: {
      positionCalc(index) {
        const indexInSet = index - this.contentSetStart;
        const gutterOffset = indexInSet * gutterWidth;
        const cardOffset = indexInSet * contentCardWidth;
        return { left: `${cardOffset + gutterOffset}px` };
      },
      setStartPosition(el) {
        // sets the initial spot from which cards will be sliding into place from
        // direction depends on `leftToRight`
        const originalPosition = parseInt(el.style.left, 10);
        const cards = this.contentSetSize * contentCardWidth;
        const gutters = (this.contentSetSize - 1) * gutterWidth;
        const carouselContainerOffset = cards + gutters;
        const sign = this.leftToRight ? -1 : 1;

        if (this.interacted) {
          el.style.left = `${sign * carouselContainerOffset + originalPosition}px`;
        }
      },
      slide(el) {
        // moves cards from their starting point by their offset
        // direction depends on `leftToRight`
        const originalPosition = parseInt(el.style.left, 10);
        const cards = this.contentSetSize * contentCardWidth;
        const gutters = (this.contentSetSize - 1) * gutterWidth;
        const carouselContainerOffset = cards + gutters;
        const sign = this.leftToRight ? 1 : -1;

        if (this.interacted) {
          el.style.left = `${sign * carouselContainerOffset + originalPosition}px`;
        }
      },
      isInThisSet(index) {
        return this.contentSetStart <= index && index <= this.contentSetEnd;
      },
      nextSet() {
        this.contentSetStart += this.contentSetSize;
        this.leftToRight = false;
      },
      previousSet() {
        this.contentSetStart -= this.contentSetSize;
        this.leftToRight = true;
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  // width of card + gutter
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


    &-controls
      $hit-height = 100px

      $hit-width = $hit-height
      // set up the parent element that the buttons use for reference
      position: absolute
      width: 100%
      clearfix()

      // styles that apply to both control buttons
      .next, .previous
        &:active
          z-index: 8 // material
          // goes up one reference (Stylus partial reference)

        z-index: 2 // material
        position: absolute
        top: ($card-height / 2)
        transform: translateY(-($hit-height / 2))
        height: $hit-height
        width: $hit-width
        text-align: center
        vertical-align: middle

        &-button
          &:active
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23) // material
          box-shadow: 0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)
          // center align within hitbox
          position: absolute
          top: 50%
          left: 50%
          transform: translate(-50%, -50%)

      // position-specific styles for each control button
      .next
        right: -($hit-width/2)
      .previous
        left: -($hit-width/2)

    &-set
      $max-card-shadow-offset = 14px
      position: relative
      height: $card-height + $max-card-shadow-offset
      overflow-x: hidden
      overflow-y: visible

    &-card
      transition: left 0.4s linear
      position: absolute

</style>
