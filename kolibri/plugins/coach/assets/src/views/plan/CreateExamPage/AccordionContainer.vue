<template>

  <div>
    <div>
      <DragContainer
        :items="items"
      >
        <transition-group
          tag="div"
          name="list"
          class="wrapper"
        >
          <slot :toggleItemState="toggleItemState" :isItemExpanded="isItemExpanded"></slot>
        </transition-group>
      </DragContainer>
    </div>
  </div>

</template>


<script>

  // import DragSortWidget from 'kolibri.coreVue.components.DragSortWidget';
  import DragContainer from 'kolibri.coreVue.components.DragContainer';

  export default {
    name: 'AccordionContainer',
    components: {
      DragContainer,
    },
    props: {
      items: {
        type: Array,
        required: true,
      },
    },
    data() {
      return {
        itemIds: [],
      };
    },
    methods: {
      toggleItemState(id) {
        const index = this.itemIds.indexOf(id);
        if (index === -1) {
          this.itemIds.push(id);
        } else {
          this.itemIds.splice(index, 1);
        }
      },
      isItemExpanded(id) {
        if (this.itemIds.includes(id)) {
          return true;
        } else {
          return false;
        }
      },
    },
  };

</script>
