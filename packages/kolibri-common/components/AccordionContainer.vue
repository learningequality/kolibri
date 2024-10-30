<template>

  <div class="accordion">
    <KGrid
      v-if="!hideTopActions"
      :style="{
        backgroundColor: $themePalette.grey.v_200,
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
    </KGrid>
    <transition-group
      tag="div"
      name="list"
      class="wrapper"
    >
      <slot></slot>
    </transition-group>
  </div>

</template>


<script>

  export default {
    name: 'AccordionContainer',
    props: {
      hideTopActions: {
        type: Boolean,
        default: false,
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .accordion {
    @extend %dropshadow-1dp;
  }

  .header-actions {
    margin-top: auto;
    margin-bottom: auto;
  }

  .header-left-actions {
    display: flex;
  }

  .header-right-actions {
    display: flex;
    justify-content: flex-end;
  }

  .collapse-button {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-width: 40px;
    padding-right: 0;
    padding-left: 0;
    border-radius: 50%;
  }

</style>
