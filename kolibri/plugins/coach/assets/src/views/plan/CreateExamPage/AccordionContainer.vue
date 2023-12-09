<template>

  <div class="accordion">
    <KGrid
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
          <KIconButton
            icon="expandAll"
            :tooltip="expandAll$()"
            :disabled="expandedItemIds.length === items.length"
            @click="expandAll"
          />
          <KIconButton
            icon="collapseAll"
            :tooltip="collapseAll$()"
            :disabled="expandedItemIds.length === 0"
            @click="collapseAll"
          />
          <slot name="right-actions"></slot>
        </div>
      </KGridItem>
    </KGrid>
    <transition-group
      tag="div"
      name="list"
      class="wrapper"
    >
      <slot
        :toggleItemState="toggleItemState"
        :isItemExpanded="isItemExpanded"
        :closeAccordionPanel="closeAccordionPanel"
      ></slot>
    </transition-group>
  </div>

</template>


<script>

  import { enhancedQuizManagementStrings } from 'kolibri-common/strings/enhancedQuizManagementStrings';

  export default {
    name: 'AccordionContainer',
    setup() {
      const { expandAll$, collapseAll$ } = enhancedQuizManagementStrings;
      return {
        expandAll$,
        collapseAll$,
      };
    },
    props: {
      items: {
        type: Array,
        required: true,
        function(value) {
          return value.every(item => typeof item === 'object' && 'id' in item);
        },
      },
    },
    data() {
      return {
        expandedItemIds: [],
      };
    },
    methods: {
      expandAll() {
        this.expandedItemIds = this.items.map(item => item.id);
      },
      collapseAll() {
        this.expandedItemIds = [];
      },
      toggleItemState(id) {
        const index = this.expandedItemIds.indexOf(id);
        if (index === -1) {
          this.expandedItemIds.push(id);
        } else {
          this.expandedItemIds.splice(index, 1);
        }
      },
      isItemExpanded(id) {
        return this.expandedItemIds.includes(id);
      },
      closeAccordionPanel(id) {
        if (this.expandedItemIds.includes(id)) {
          const index = this.expandedItemIds.indexOf(id);
          this.expandedItemIds.splice(index, 1);
        }
      },
    },
  };

</script>


<style lang="scss"  scoped>

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
