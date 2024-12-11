<template>

  <div
    class="accordion"
    :style="{ border: `1px solid ${$themeTokens.fineLine}` }"
  >
    <div
      v-if="hasHeaderSlot"
      class="header"
      :style="{
        borderColor: $themeTokens.fineLine,
        backgroundColor: $themePalette.grey.v_100,
        ...headerAppearanceOverrides,
      }"
    >
      <slot
        name="header"
        :canExpandAll="canExpandAll"
        :expandAll="expandAll"
        :canCollapseAll="canCollapseAll"
        :collapseAll="collapseAll"
      ></slot>
    </div>
    <div>
      <slot name="default"></slot>
    </div>
  </div>

</template>


<script>

  import { computed } from 'vue';
  import useAccordion from './useAccordion';

  export default {
    name: 'AccordionContainer',
    setup(prop, { slots }) {
      const { canExpandAll, canCollapseAll, collapseAll, expandAll } = useAccordion();

      const hasHeaderSlot = computed(() => !!slots.header);

      return {
        hasHeaderSlot,
        canExpandAll,
        canCollapseAll,
        collapseAll,
        expandAll,
      };
    },
    props: {
      headerAppearanceOverrides: {
        type: [Object, String],
        default: null,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .header {
    padding: 10px;
    border-top: 1px solid;
    border-bottom: 1px solid;
  }

</style>
