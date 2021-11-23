<template>

  <section>
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
        ref="aside"
        class="aside"
      >
        <slot name="aside"></slot>
      </aside>

      <div
        ref="main"
        class="main"
        :class="{ 'main-with-aside': $slots.aside }"
      >
        <slot name="main"></slot>
      </div>

    </div>
    <footer
      v-if="$slots.footer"
      ref="footer"
      class="footer"
      :style="footerStyle"
    >
      <slot name="footer"></slot>
    </footer>
  </section>

</template>


<script>

  export default {
    name: 'EmbeddedMultiPaneLayout',
    computed: {
      footerStyle() {
        return {
          borderTopColor: this.$themeTokens.textDisabled,
        };
      },
    },
  };

</script>


<style lang="scss" scoped>

  .header {
    padding: 16px;
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
