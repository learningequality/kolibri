<template>

  <div>
    <header
      v-if="$slots.header"
      ref="header"
      class="header"
      :style="styles.header"
    >
      <slot name="header"></slot>
    </header>

    <div>
      <aside
        v-if="$slots.aside"
        ref="aside"
        class="aside"
        :style="styles.aside"
      >
        <slot name="aside"></slot>
      </aside>

      <main
        ref="main"
        class="main"
        :class="{'main-with-aside': $slots.aside }"
        :style="styles.main"
      >
        <slot name="main"></slot>
      </main>

    </div>
    <footer
      v-if="$slots.footer"
      ref="footer"
      class="footer"
      :style="styles.footer"
    >
      <slot name="footer"></slot>
    </footer>
  </div>

</template>


<script>

  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import responsiveElementMixin from 'kolibri.coreVue.mixins.responsiveElementMixin';

  export default {
    name: 'MultiPaneLayout',
    mixins: [responsiveWindowMixin, responsiveElementMixin],
    computed: {
      maxHeight() {
        const APP_BAR_HEIGHT = this.windowIsSmall ? 56 : 64;
        const PADDING = this.windowIsSmall ? 16 : 32;
        const MARGIN = 16;
        let maxHeight = this.windowHeight - APP_BAR_HEIGHT - PADDING * 2 - MARGIN;
        if (this.$refs.header) {
          maxHeight = maxHeight - this.$refs.header.clientHeight;
        }
        if (this.$refs.footer) {
          maxHeight = maxHeight - this.$refs.footer.clientHeight;
        }
        return maxHeight;
      },
      styles() {
        return {
          header: {
            borderBottomColor: this.$themeTokens.textDisabled,
          },
          aside: {
            maxHeight: `${this.maxHeight}px`,
          },
          main: {
            maxHeight: this.$slots.aside ? `${this.maxHeight}px` : '',
          },
          footer: {
            borderTopColor: this.$themeTokens.textDisabled,
          },
        };
      },
    },
    methods: {
      /**
       * @public
       */
      scrollMainToTop() {
        this.$refs.main.scrollTop = 0;
      },
    },
  };

</script>


<style lang="scss" scoped>

  .header {
    padding: 16px;
    border-bottom-style: solid;
    border-bottom-width: 1px;
  }

  .aside,
  .main {
    overflow-y: auto;
  }

  .aside {
    display: inline-block;
    width: 33%;
    padding: 16px;
  }

  .main-with-aside {
    display: inline-block;
    width: 67%;
    padding: 16px;
    vertical-align: top;
  }

  .footer {
    padding: 16px;
    border-top-style: solid;
    border-top-width: 1px;
  }

</style>
