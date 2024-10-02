<template>

  <div class="accordion">
    <div
      v-if="$slots.header"
      class="header"
      :style="{
        borderColor: $themeTokens.fineLine,
        backgroundColor: $themePalette.grey.v_50,
        ...headerAppearanceOverrides,
      }"
    >
      <slot name="header"></slot>
    </div>
    <!-- <KGrid
      v-if="!hideTopActions"
      :style="{
        backgroundColor: $themePalette.grey.v_100,
      }"
    >
      <KGridItem
        :layout4="{ span: 2 }"
        :layout8="{ span: 4 }"
        :layout12="{ span: 6 }"
        class="header-actions"
      >
        <div class="header-left-actions">
          <slot name="left-actions"></slot>
        </div>
      </KGridItem>
      <KGridItem
        :layout4="{ span: 2 }"
        :layout8="{ span: 4 }"
        :layout12="{ span: 6 }"
        class="header-actions"
      >
        <div class="header-right-actions">
          <slot name="right-actions"></slot>
        </div>
      </KGridItem>
    </KGrid> -->
    <div>
      <slot></slot>
    </div>
  </div>

</template>


<script>

  export default {
    name: 'AccordionContainer',
    props: {
      headerAppearanceOverrides: {
        type: [Object, String],
        default: null,
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .accordion {
    @extend %dropshadow-1dp;
  }

  .header {
    padding: 10px;
    border-top: 1px solid;
    border-bottom: 1px solid;
  }

</style>
