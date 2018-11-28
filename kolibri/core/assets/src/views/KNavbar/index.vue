<template>

  <div
    class="wrapper"
    :class="wrapperClass"
    :style="{ backgroundColor: $coreActionNormal }"
  >
    <nav>
      <button
        v-show="!enoughSpace"
        class="scroll-button"
        @click="handleClickPrevious"
      >
        <mat-svg
          name="keyboard_arrow_left"
          category="hardware"
          class="scroll-button-icon"
          :class="{ 'rtl-icon': isRtl }"
        />
      </button>

      <ul
        ref="navbarUl"
        class="items"
        :style="{ maxWidth: `${ maxWidth }px` }"
      >
        <!-- Contains KNavbarLink components -->
        <slot></slot>
      </ul>

      <button
        v-show="!enoughSpace"
        class="scroll-button"
        :class="$pseudoClass(scrollButton)"
        @click="handleClickNext"
      >
        <mat-svg
          name="keyboard_arrow_right"
          category="hardware"
          class="scroll-button-icon"
          :class="{ 'rtl-icon': isRtl }"
        />
      </button>
    </nav>
  </div>

</template>


<script>

  import { mapGetters } from 'vuex';
  import responsiveElement from 'kolibri.coreVue.mixins.responsiveElement';
  import throttle from 'lodash/throttle';

  /**
   * Used for navigation between sub-pages of a top-level Kolibri section
   */
  export default {
    name: 'KNavbar',
    mixins: [responsiveElement],
    data() {
      return {
        enoughSpace: true,
      };
    },
    computed: {
      ...mapGetters(['$coreActionNormal', '$coreOutline']),
      maxWidth() {
        return this.enoughSpace ? this.elementWidth : this.elementWidth - 38 * 2;
      },
      wrapperClass() {
        if (!this.enoughSpace) {
          return ['wrapper-narrow'];
        }
      },
      scrollButton() {
        return {
          ':hover': {
            outline: this.$coreOutline,
          },
        };
      },
    },
    mounted() {
      this.checkSpace();
      this.$watch('elementWidth', this.throttleCheckSpace);
    },
    methods: {
      checkSpace() {
        const availableWidth = this.elementWidth;
        const items = this.$children;
        let widthOfItems = 0;
        items.forEach(item => {
          const itemWidth = Math.ceil(item.$el.getBoundingClientRect().width);
          widthOfItems += itemWidth;
        });
        // Subtract 16px to account for padding-left
        this.enoughSpace = widthOfItems <= availableWidth - 16;
      },
      throttleCheckSpace: throttle(function() {
        this.checkSpace();
      }, 100),
      handleClickPrevious() {
        this.isRtl ? this.scrollRight() : this.scrollLeft();
      },
      handleClickNext() {
        this.isRtl ? this.scrollLeft() : this.scrollRight();
      },
      scrollLeft() {
        this.$refs.navbarUl.scrollLeft -= this.maxWidth;
      },
      scrollRight() {
        this.$refs.navbarUl.scrollLeft += this.maxWidth;
      },
    },
  };

</script>


<style lang="scss" scoped>

  .wrapper {
    padding-left: 16px;
  }

  .wrapper-narrow {
    padding-left: 0;
  }

  .items {
    display: inline-block;
    padding: 0;
    margin: 0;
    overflow-x: auto;
    overflow-y: hidden;
    white-space: nowrap;
    vertical-align: middle;
  }

  .scroll-button {
    width: 36px;
    height: 36px;
    vertical-align: middle;
  }

  .scroll-button-icon {
    fill: white;
  }

</style>
