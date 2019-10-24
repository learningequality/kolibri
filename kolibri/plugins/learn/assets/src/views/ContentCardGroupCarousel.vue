<template>

  <section class="content-carousel">

    <div :style="contentControlsContainerStyles">
      <div
        v-show="!isFirstSet"
        class="content-carousel-previous-control"
        @click="previousSet"
      >
        <UiIconButton
          class="content-carousel-previous-control-button"
          :style="buttonTransforms"
          :disabled="isFirstSet"
          size="large"
        >
          <mat-svg name="arrow_back" category="navigation" />
        </UiIconButton>
      </div>

      <transition-group
        :style="contentSetStyles"
        tag="div"
        @leave="slide"
        @before-enter="setStartPosition"
        @enter="slide"
      >

        <!-- eslint-disable vue/no-use-v-if-with-v-for -->
        <ContentCard
          v-for="(content, index) in contents"
          v-if="isInThisSet(index)"
          :key="content.id"
          class="content-carousel-card"
          :style="positionCalc(index)"
          :title="content.title"
          :thumbnail="content.thumbnail"
          :kind="content.kind"
          :progress="content.progress"
          :numCoachContents="content.num_coach_contents"
          :link="genContentLink(content.id, content.kind)"
        />
      </transition-group>

      <div
        v-show="!isLastSet"
        class="content-carousel-next-control"
        @click="nextSet"
      >
        <UiIconButton
          class="content-carousel-next-control-button"
          :style="buttonTransforms"
          :disabled="isLastSet"
          size="large"
        >
          <mat-svg name="arrow_forward" category="navigation" />
        </UiIconButton>
      </div>

    </div>


  </section>

</template>


<script>

  import responsiveElementMixin from 'kolibri.coreVue.mixins.responsiveElementMixin';
  import { validateLinkObject } from 'kolibri.utils.validators';
  import UiIconButton from 'kolibri.coreVue.components.UiIconButton';
  import ContentCard from './ContentCard';

  if (!ContentCard.mixins) {
    ContentCard.mixins = [];
  }
  ContentCard.mixins.push(responsiveElementMixin); //including because carousel breaks without it

  const contentCardWidth = 210;
  const gutterWidth = 20;
  const horizontalShadowOffset = 12;

  export default {
    name: 'ContentCardGroupCarousel',
    components: {
      UiIconButton,
      ContentCard,
    },
    mixins: [responsiveElementMixin],
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
        if (this.elementWidth > 2 * this.contentCardWidth) {
          const numOfCards = Math.floor(this.elementWidth / this.contentCardWidth);
          const numOfGutters = numOfCards - 1;
          const totalWidth = numOfCards * this.contentCardWidth + numOfGutters * this.gutterWidth;
          if (this.elementWidth >= totalWidth) {
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
        const cards = this.contentSetSize * this.contentCardWidth + horizontalShadowOffset;
        const gutters = (this.contentSetSize - 1) * this.gutterWidth;
        const maxCardShadowOffset = 14; // determined by css styles on cards
        const topShadowOffset = 10;
        return {
          'min-width': `${this.contentCardWidth}px`,
          'overflow-x': 'hidden',
          width: `${cards + gutters + maxCardShadowOffset}px`,
          // Bottom shadow is a little bit bigger, so add a few pixels more
          height: `${this.contentCardWidth + maxCardShadowOffset + topShadowOffset + 3}px`,
          position: 'relative',
          'padding-top': `${topShadowOffset}px`,
        };
      },
      contentControlsContainerStyles() {
        const cards = this.contentSetSize * this.contentCardWidth;
        const gutters = (this.contentSetSize - 1) * this.gutterWidth;
        return {
          width: `${cards + gutters}px`,
          minHeight: `${this.contentCardWidth}px`,
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
        const gutterOffset = indexInSet * this.gutterWidth;
        const cardOffset = indexInSet * this.contentCardWidth;
        return { [this.animationAttr]: `${cardOffset + gutterOffset + horizontalShadowOffset}px` };
      },
      setStartPosition(el) {
        if (this.interacted) {
          // sets the initial spot from which cards will be sliding into place from
          // direction depends on `panBackwards`
          const originalPosition = parseInt(el.style[this.animationAttr], 10);
          const cards = this.contentSetSize * this.contentCardWidth;
          const gutters = this.contentSetSize * this.gutterWidth;
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
          const cards = this.contentSetSize * this.contentCardWidth;
          const gutters = this.contentSetSize * this.gutterWidth;
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
    $trs: {},
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  // from http://nicolasgallagher.com/micro-clearfix-hack/
  @mixin clearfix() {
    zoom: 1;
    &::after,
    &::before {
      display: table;
      content: '';
    }
    &::after {
      clear: both;
    }
  }

  // width of card + gutter
  $card-height: 210px;
  $control-hit-height: 100px;
  $control-hit-width: $control-hit-height;

  .content-carousel {
    @include clearfix();

    position: relative;
    margin-top: 1em;
  }

  .content-carousel-control-container {
    position: relative;
    overflow: visible;
  }

  .content-carousel-card {
    position: absolute;
    left: 0;
    transition: left 0.4s ease, box-shadow $core-time ease;
  }

  .content-carousel-next-control,
  .content-carousel-previous-control {
    position: absolute;
    top: $card-height / 2;
    z-index: 2; // material
    width: $control-hit-width;
    height: $control-hit-height;
    text-align: center;
    vertical-align: middle;
    transform: translateY(-($control-hit-height / 2));
    // styles that apply to both control buttons
    &:active {
      z-index: 8; // material
    }
  }

  .content-carousel-next-control-button,
  .content-carousel-previous-control-button {
    @extend %dropshadow-1dp;
    // center align within hitbox
    position: absolute;
    top: 50%;
    left: 50%;
    &:active {
      @extend %dropshadow-8dp;
    }
  }

  // position-specific styles for each control button
  .content-carousel-next-control {
    right: -($control-hit-width / 2) - 25;
  }
  .content-carousel-previous-control {
    left: -($control-hit-width / 2);
  }

</style>
