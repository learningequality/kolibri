<template>

  <nav>
    <button
      v-show="!enoughSpace"
      class="k-navbar-scroll-button"
      @click="isRtl ? scrollRight() : scrollLeft()"
    >
      <mat-svg
        name="keyboard_arrow_left"
        category="hardware"
        :class="{ 'rtl-icon': isRtl }"
      />
    </button>

    <ul
      ref="kNavbar"
      class="k-navbar"
      :style="{ maxWidth: `${ maxWidth }px` }"
    >
      <!-- Contains k-navbar-link components -->
      <slot></slot>
    </ul>

    <button
      v-show="!enoughSpace"
      class="k-navbar-scroll-button"
      @click="isRtl ? scrollLeft() : scrollRight()"
    >
      <mat-svg
        name="keyboard_arrow_right"
        category="hardware"
        :class="{ 'rtl-icon': isRtl }"
      />
    </button>
  </nav>

</template>


<script>

  import responsiveElement from 'kolibri.coreVue.mixins.responsiveElement';
  import throttle from 'lodash/throttle';

  /**
    * Used for navigation between sub-pages of a top-level Kolibri section
    */
  export default {
    name: 'kNavbar',
    mixins: [responsiveElement],
    data: () => ({
      enoughSpace: true,
    }),
    computed: {
      maxWidth() {
        return this.enoughSpace ? this.elSize.width : this.elSize.width - 36 * 2;
      },
    },
    mounted() {
      this.checkSpace();
      this.$watch('elSize.width', this.throttleCheckSpace);
    },
    methods: {
      checkSpace() {
        const availableWidth = this.elSize.width;
        const items = this.$children;
        let widthOfItems = 0;
        items.forEach(item => {
          const itemWidth = Math.ceil(item.$el.getBoundingClientRect().width);
          widthOfItems += itemWidth;
        });
        this.enoughSpace = widthOfItems <= availableWidth;
      },
      throttleCheckSpace: throttle(function() {
        this.checkSpace();
      }, 100),
      scrollLeft() {
        this.$refs.kNavbar.scrollLeft -= this.maxWidth;
      },
      scrollRight() {
        this.$refs.kNavbar.scrollLeft += this.maxWidth;
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .k-navbar
    white-space: nowrap
    overflow-x: auto
    overflow-y: hidden
    margin: 0
    padding: 0
    display: inline-block
    vertical-align: middle

  .k-navbar-scroll-button
    width: 36px
    height: 36px
    vertical-align: middle
    &:focus
      outline: $core-outline

</style>
