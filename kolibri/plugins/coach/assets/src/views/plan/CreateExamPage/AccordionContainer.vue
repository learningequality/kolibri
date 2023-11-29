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
          <KButton
            class="collapse-button"
            appearance="flat-button"
            @click="collapseAll"
          >
            <!-- Should be replaced by a KIconButton when the icon is available on KDS -->
            <KIcon
              class="reduce-chervon-spacing"
              icon="chevronDown"
            />
            <KIcon
              class="reduce-chervon-spacing"
              icon="chevronUp"
            />
          </KButton>
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

  export default {
    name: 'AccordionContainer',
    data() {
      return {
        expandedItemIds: [],
      };
    },
    methods: {
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
      collapseAll() {
        this.expandedItemIds = [];
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
    margin-left: 1em;
  }

  .header-right-actions {
    display: flex;
    justify-content: flex-end;
    margin-right: 1em;

    /deep/ & > * {
      margin-left: 1em;
    }
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
