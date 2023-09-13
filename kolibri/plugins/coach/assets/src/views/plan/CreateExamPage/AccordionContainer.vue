<template>

  <div>
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
      closeAccordionPanel(id){
        if(this.expandedItemIds.includes(id)){
          const index = this.expandedItemIds.indexOf(id);
          this.expandedItemIds.splice(index, 1);
        }
      }
    },
  };

</script>
