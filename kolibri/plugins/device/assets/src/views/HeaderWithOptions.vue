<template>

  <KGrid>
    <KGridItem
      :layout8="{ span: 4 }"
      :layout12="{ span: 6 }"
    >
      <slot name="header">
        <h1>{{ headerText }}</h1>
      </slot>
    </KGridItem>
    <KGridItem
      :layout8="{ span: 4, alignment: 'right' }"
      :layout12="{ span: 6, alignment: 'right' }"
      :style="{ padding: windowIsSmall ? '0 8px 16px' : '0' }"
      class="buttons"
    >
      <slot name="options"></slot>
    </KGridItem>
  </KGrid>

</template>


<script>

  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';

  export default {
    name: 'HeaderWithOptions',
    setup() {
      const { windowIsSmall } = useKResponsiveWindow();
      return {
        windowIsSmall,
      };
    },
    props: {
      headerText: {
        type: String,
        default: null,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .buttons {
    margin: auto;
  }

</style>
