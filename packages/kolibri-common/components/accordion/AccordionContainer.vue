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
    <component
      :is="listWrapperTag"
      class="accordion-list-wrapper"
    >
      <slot name="default"></slot>
    </component>
  </div>

</template>


<script>

  import { computed } from 'vue';
  import useAccordion from './useAccordion';

  export default {
    name: 'AccordionContainer',
    setup(props, { slots }) {
      const { canExpandAll, canCollapseAll, collapseAll, expandAll } = useAccordion({
        multiple: props.multiple,
      });

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
      /**
       * Whether the accordion can have multiple items expanded at once.
       */
      multiple: {
        type: Boolean,
        default: true,
      },
      listWrapperTag: {
        type: String,
        default: 'div',
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

  .accordion-list-wrapper {
    padding: 0;
    margin: 0;
    list-style: none;
  }

</style>
