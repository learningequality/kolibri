<template>

  <div>
    <transition-group
      tag="div"
      name="list"
      class="wrapper"
    >
      <slot
        name="top"
        :expandAll="expandAll"
        :collapseAll="collapseAll"
      ></slot>
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
    watch: {
      expandedItemIds() {
        this.$emit('toggled', this.expandedItemIds);
      },
    },
    methods: {
      expandAll(ids = []) {
        this.expandedItemIds = ids;
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
        this.$emit('toggled', this.expandedItemIds);
      },
    },
  };

</script>
