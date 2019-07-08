<template>

  <div>
    <KGrid>
      <KGridItem sizes="3, 3, 3">
        <slot name="otherFilter"></slot>
      </KGridItem>
      <KGridItem sizes="9, 9, 9" align="right" class="text-filter">
        <KFilterTextbox
          v-model.trim="filterInput"
          :placeholder="filterPlaceholder"
          @input="pageNum = 1"
        />
      </kgriditem>
    </KGrid>

    <div>
      <slot v-bind="{items: visibleFilteredItems, filterInput}"></slot>
    </div>

    <nav>
      <span dir="auto" class="pagination-label">
        {{ $tr('pagination', { visibleStartRange, visibleEndRange, numFilteredItems }) }}
      </span>
      <UiIconButton
        type="primary"
        :ariaLabel="$tr('previousResults')"
        :disabled="pageNum === 1"
        size="small"
        class="pagination-button"
        @click="goToPage(pageNum - 1)"
      >
        <KIcon icon="back" style="position: relative; top: -1px;" />
      </UiIconButton>
      <UiIconButton
        type="primary"
        :ariaLabel="$tr('nextResults')"
        :disabled="pageNum === 0 || pageNum === numPages"
        size="small"
        class="pagination-button"
        @click="goToPage(pageNum + 1)"
      >
        <KIcon icon="forward" style="position: relative; top: -1px;" />
      </UiIconButton>
    </nav>
  </div>

</template>


<script>

  import UiIconButton from 'kolibri.coreVue.components.UiIconButton';
  import KFilterTextbox from 'kolibri.coreVue.components.KFilterTextbox';
  import KIcon from 'kolibri.coreVue.components.KIcon';
  import KGrid from 'kolibri.coreVue.components.KGrid';
  import KGridItem from 'kolibri.coreVue.components.KGridItem';

  export default {
    name: 'PaginatedListContainer',
    components: {
      KIcon,
      UiIconButton,
      KFilterTextbox,
      KGrid,
      KGridItem,
    },
    props: {
      // The entire list of items
      items: {
        type: Array,
        required: true,
      },
      filterFunction: {
        type: Function,
      },
      filterPlaceholder: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        filterInput: '',
        pageNum: 1,
        perPage: 10,
      };
    },
    computed: {
      filteredItems() {
        if (this.filterFunction) {
          return this.filterFunction(this.items, this.filterInput);
        }
        return this.items;
      },
      numFilteredItems() {
        return this.filteredItems.length;
      },
      numPages() {
        return Math.ceil(this.numFilteredItems / this.perPage);
      },
      startRange() {
        return (this.pageNum - 1) * this.perPage;
      },
      visibleStartRange() {
        return Math.min(this.startRange + 1, this.numFilteredItems);
      },
      endRange() {
        return this.pageNum * this.perPage;
      },
      visibleEndRange() {
        return Math.min(this.endRange, this.numFilteredItems);
      },
      visibleFilteredItems() {
        return this.filteredItems.slice(this.startRange, this.endRange);
      },
    },
    methods: {
      goToPage(page) {
        this.pageNum = page;
      },
    },
    $trs: {
      previousResults: 'Previous results',
      nextResults: 'Next results',
      pagination:
        '{ visibleStartRange, number } - { visibleEndRange, number } of { numFilteredItems, number }',
    },
  };

</script>


<style lang="scss" scoped>

  .actions-header,
  nav {
    text-align: end;
  }

  .pagination-button {
    margin-left: 8px;
  }

  .text-filter {
    margin-top: 14px;
  }

</style>
