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
          <slot
            :toggleItemState="toggleItemState"
            :isItemExpanded="isItemExpanded"
            :isOptionSelected="isOptionSelected"
            :isAnswerSelected="isAnswerSelected"
          ></slot>
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
        expandedItemIds: [],
        optionsIdList: [],
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
        if (this.expandedItemIds.includes(id)) {
          return true;
        } else {
          return false;
        }
      },
      isOptionSelected(optionId) {
        const index = this.expandedItemIds.indexOf(optionId);
        if (index === -1) {
          this.optionsIdList.push(optionId);
        } else {
          this.optionsIdList.splice(optionId);
        }
      },
      isAnswerSelected(optionId) {
        if (this.optionsIdList.includes(optionId)) {
          return true;
        } else {
          return false;
        }
      },
    },
  };

</script>
