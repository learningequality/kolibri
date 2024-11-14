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

    <section
      v-if="$slots.subheader"
      ref="subheader"
      class="subheader"
    >
      <slot name="subheader"></slot>
    </section>

    <KFixedGrid numCols="3">
      <KFixedGridItem
        v-if="$slots.aside"
        ref="aside"
        :style="styles.aside"
        span="1"
      >
        <div class="aside">
          <slot name="aside"></slot>
        </div>
      </KFixedGridItem>

      <KFixedGridItem
        ref="main"
        :span="$slots.aside ? 2 : 3"
        :class="{ 'main-with-aside': $slots.aside }"
      >
        <div class="main">
          <slot name="main"></slot>
        </div>
      </KFixedGridItem>
    </KFixedGrid>
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

  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';

  export default {
    name: 'MultiPaneLayout',
    setup() {
      const { windowHeight } = useKResponsiveWindow();
      return {
        windowHeight,
      };
    },
    computed: {
      styles() {
        return {
          header: {
            borderBottomColor: this.$themeTokens.textDisabled,
          },
          aside: {
            maxHeight: `${this.windowHeight}px`,
            overflowY: 'auto',
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

  .subheader {
    padding: 16px;
  }

  .aside {
    padding: 16px;
  }

  .main-with-aside {
    padding: 16px;
    vertical-align: top;
  }

  .footer {
    padding: 16px;
    border-top-style: solid;
    border-top-width: 1px;
  }

</style>
