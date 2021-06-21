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
        :class="{ 'main-with-aside': $slots.aside }"
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
      styles() {
        return {
          header: {
            borderBottomColor: this.$themeTokens.textDisabled,
          },
          aside: {
            maxHeight: `${this.windowHeight}px`,
          },
          main: {
            maxHeight: this.$slots.aside ? `${this.windowHeight}px` : '',
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

  .main,
  .aside {
    height: 100%;
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
