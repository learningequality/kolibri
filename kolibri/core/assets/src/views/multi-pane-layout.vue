<template>

  <div>
    <header
      v-if="$slots.header"
      ref="header"
      class="header"
    >
      <slot name="header"></slot>
    </header>

    <div>
      <aside
        v-if="$slots.aside"
        class="aside"
        :style="{ maxHeight: `${maxHeight}px` }"
      >
        <slot name="aside"></slot>
      </aside>

      <main
        ref="main"
        class="main"
        :class="{'main-with-aside': $slots.aside }"
        :style="{ maxHeight: $slots.aside ? `${maxHeight}px` : '' }"
      >
        <slot name="main"></slot>
      </main>

    </div>
    <footer
      v-if="$slots.footer"
      class="footer"
      ref="footer"
    >
      <slot name="footer"></slot>
    </footer>
  </div>

</template>


<script>

  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import responsiveElement from 'kolibri.coreVue.mixins.responsiveElement';

  export default {
    name: 'multiPaneLayout',
    mixins: [responsiveWindow, responsiveElement],
    computed: {
      maxHeight() {
        const APP_BAR_HEIGHT = this.windowSize.breakpoint < 2 ? 56 : 64;
        const PADDING = this.windowSize.breakpoint < 2 ? 16 : 32;
        const MARGIN = 16;
        let maxHeight = this.windowSize.height - APP_BAR_HEIGHT - PADDING * 2 - MARGIN;
        if (this.$refs.header) {
          maxHeight = maxHeight - this.$refs.header.clientHeight;
        }
        if (this.$refs.footer) {
          maxHeight = maxHeight - this.$refs.footer.clientHeight;
        }
        return maxHeight;
      },
    },
    methods: {
      scrollMainToTop() {
        this.$refs.main.scrollTop = 0;
      },
    },
  };

</script>


<style scoped lang="stylus">

  .header
    margin-bottom: 8px

  .aside, .main
    overflow-y: auto

  .aside
    display: inline-block
    width: 25%
    margin-right: 8px

  .main-with-aside
    display: inline-block
    width: calc(75% - 8px)
    vertical-align: top

  .footer
    margin-top: 8px

</style>
