<template>

  <section class="content-carousel">

    <div :style="contentControlsContainerStyles">

      <div
        class="content-carousel-previous-control"
        @click="previousSet"
        v-show="!isFirstSet"
      >
        <ui-icon-button
          class="content-carousel-previous-control-button"
          :style="buttonTransforms"
          :disabled="isFirstSet"
          :disableRipple="true"
          size="large"
        >
          <mat-svg name="arrow_back" category="navigation" />
        </ui-icon-button>
      </div>

      <transition-group
        :style="contentSetStyles"
        tag="div"
        @leave="slide"
        @before-enter="setStartPosition"
        @enter="slide"
      >

        <content-card
          class="content-carousel-card"
          v-for="(content, index) in contents"
          v-if="isInThisSet(index)"
          :style="positionCalc(index)"
          :key="content.id"
          :title="content.title"
          :thumbnail="content.thumbnail"
          :kind="content.kind"
          :progress="content.progress"
          :numCoachContents="content.num_coach_contents"
          :link="genContentLink(content.id, content.kind)"
        />
      </transition-group>

      <div
        class="content-carousel-next-control"
        @click="nextSet"
        v-show="!isLastSet"
      >
        <ui-icon-button
          class="content-carousel-next-control-button"
          :style="buttonTransforms"
          :disabled="isLastSet"
          :disableRipple="true"
          size="large"
        >
          <mat-svg name="arrow_forward" category="navigation" />
        </ui-icon-button>
      </div>

    </div>


  </section>

</template>


<script>

  import responsiveElement from 'kolibri.coreVue.mixins.responsiveElement';
  import { validateLinkObject } from 'kolibri.utils.validators';
  import uiIconButton from 'keen-ui/src/UiIconButton';
  import contentCard from './content-card';

  if (!contentCard.mixins) {
    contentCard.mixins = [];
  }
  contentCard.mixins.push(responsiveElement); //including because carousel breaks without it

  const contentCardWidth = 210;
  const gutterWidth = 20;

  export default {
    name: 'contentCardGroupCarousel',
    components: {
      uiIconButton,
      contentCard,
    },
    mixins: [responsiveElement],
    $trs: { viewAllButtonLabel: 'View all' },
    props: {
      contents: {
        type: Array,
        required: true,
      },
      genContentLink: {
        type: Function,
        validator(genContentLinkFunc) {
          const dummyExercise = genContentLinkFunc(1, 'exercise');
          const isValidLinkGenerator = validateLinkObject(dummyExercise);
          return isValidLinkGenerator;
        },
      },
    },
    data() {
      return {
        // flag marks holds the index (in contents array, prop) of first item in carousel
        contentSetStart: 0,
        // flag that marks when the slide animation will be going start at left
        panBackwards: false,
        // tracks whether the carousel has been interacted with
        interacted: false,
        contentCardWidth,
        gutterWidth,
      };
    },
    computed: {
      animationAttr() {
        return this.isRtl ? 'right' : 'left';
      },
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
      contentSetStyles() {
        const cards = this.contentSetSize * contentCardWidth;
        const gutters = (this.contentSetSize - 1) * gutterWidth;
        const maxCardShadowOffset = 14; // determined by css styles on cards
        return {
          'min-width': `${contentCardWidth}px`,
          'overflow-x': 'hidden',
          width: `${cards + gutters + maxCardShadowOffset}px`,
          height: `${contentCardWidth + maxCardShadowOffset}px`,
          position: 'relative',
        };
      },
      contentControlsContainerStyles() {
        const cards = this.contentSetSize * contentCardWidth;
        const gutters = (this.contentSetSize - 1) * gutterWidth;
        return {
          width: `${cards + gutters}px`,
          height: `${contentCardWidth}px`,
          overflow: 'visible',
          position: 'relative',
        };
      },
      buttonTransforms() {
        const alignmentTransform = 'translate(-50%, -50%)';
        const mirrorTransform = `scaleX(-1) `;

        return {
          // must mirror first, order matters
          transform: (this.isRtl ? mirrorTransform : '') + alignmentTransform,
        };
      },
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
        this.panBackwards = removingCards;

        if (this.isLastSet && addingCards && !this.isFirstSet) {
          this.contentSetStart = this.contents.length - this.contentSetSize;
          this.panBackwards = true;
        }
      },
    },
    methods: {
      positionCalc(index) {
        const indexInSet = index - this.contentSetStart;
        const gutterOffset = indexInSet * gutterWidth;
        const cardOffset = indexInSet * contentCardWidth;
        return { [this.animationAttr]: `${cardOffset + gutterOffset}px` };
      },
      setStartPosition(el) {
        if (this.interacted) {
          // sets the initial spot from which cards will be sliding into place from
          // direction depends on `panBackwards`
          const originalPosition = parseInt(el.style[this.animationAttr], 10);
          const cards = this.contentSetSize * contentCardWidth;
          const gutters = this.contentSetSize * gutterWidth;
          const carouselContainerOffset = cards + gutters;
          const sign = this.panBackwards ? -1 : 1;

          el.style[this.animationAttr] = `${sign * carouselContainerOffset + originalPosition}px`;
        }
      },
      slide(el) {
        if (this.interacted) {
          // moves cards from their starting point by their offset
          // direction depends on `panBackwards`
          const originalPosition = parseInt(el.style[this.animationAttr], 10);
          const cards = this.contentSetSize * contentCardWidth;
          const gutters = this.contentSetSize * gutterWidth;
          const carouselContainerOffset = cards + gutters;
          const sign = this.panBackwards ? 1 : -1;

          el.style[this.animationAttr] = `${sign * carouselContainerOffset + originalPosition}px`;
        }
      },
      isInThisSet(index) {
        return this.contentSetStart <= index && index <= this.contentSetEnd;
      },
      nextSet() {
        this.contentSetStart += this.contentSetSize;
        this.panBackwards = false;
      },
      previousSet() {
        this.contentSetStart -= this.contentSetSize;
        this.panBackwards = true;
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  // width of card + gutter
  $card-height = 210px
  $control-hit-height = 100px
  $control-hit-width = $control-hit-height


  .content-carousel
    margin-top: 1em
    clearfix()
    position: relative

    &-control-container
      overflow: visible
      position: relative

    &-card
      left: 0
      transition: left 0.4s linear
      position: absolute

    &-next-control, &-previous-control

      // styles that apply to both control buttons
      &:active
        z-index: 8 // material

      z-index: 2 // material
      position: absolute
      top: ($card-height / 2)
      transform: translateY(-($control-hit-height / 2))
      height: $control-hit-height
      width: $control-hit-width
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

    // position-specific styles for each control button
    &-next-control
      right: -($control-hit-width/2)
    &-previous-control
      left: -($control-hit-width/2)

</style>
