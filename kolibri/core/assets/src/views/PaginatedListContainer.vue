<template>

  <div>
    <KGrid>
      <KGridItem :layout12="{ span: 3 }">
        <slot name="otherFilter"></slot>
      </KGridItem>
      <KGridItem
        :layout12="{ span: 9, alignment: 'right' }"
        class="text-filter"
      >
        <FilterTextbox
          v-model="filterInput"
          :placeholder="filterPlaceholder"
        />
      </KGridItem>
    </KGrid>

    <div>
      <slot v-bind="{ items: visibleFilteredItems, filterInput }"></slot>
    </div>

    <nav>
      <span dir="auto" class="pagination-label">
        {{ $tr('pagination', { visibleStartRange, visibleEndRange, numFilteredItems }) }}
      </span>
      <UiIconButton
        type="primary"
        :ariaLabel="$tr('previousResults')"
        :disabled="previousButtonDisabled"
        size="small"
        class="pagination-button"
        @click="changePage(-1)"
      >
        <KIcon icon="back" class="arrow-icon" />
      </UiIconButton>
      <UiIconButton
        type="primary"
        :ariaLabel="$tr('nextResults')"
        :disabled="nextButtonDisabled"
        size="small"
        class="pagination-button"
        @click="changePage(+1)"
      >
        <KIcon icon="forward" class="arrow-icon" />
      </UiIconButton>
    </nav>
  </div>

</template>


<script>

  import UiIconButton from 'kolibri.coreVue.components.UiIconButton';
  import FilterTextbox from 'kolibri.coreVue.components.FilterTextbox';

  export default {
    name: 'PaginatedListContainer',
    components: {
      UiIconButton,
      FilterTextbox,
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
      itemsPerPage: {
        type: Number,
        required: false,
        default: 30,
      },
    },
    data() {
      return {
        filterInput: '',
        pageNum: 1,
        perPage: this.itemsPerPage,
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
      previousButtonDisabled() {
        return this.pageNum === 1 || this.numFilteredItems === 0;
      },
      nextButtonDisabled() {
        return this.pageNum === 0 || this.pageNum === this.numPages || this.numFilteredItems === 0;
      },
    },
    watch: {
      numFilteredItems: {
        handler() {
          this.pageNum = 1;
          this.$emit('pageChanged', 1);
        },
      },
    },
    methods: {
      changePage(change) {
        this.pageNum += change;
        this.$emit('pageChanged', this.pageNum);
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
    text-align: right;
  }

  .pagination-button {
    margin-left: 8px;
  }

  .text-filter {
    margin-top: 14px;
  }

  .arrow-icon {
    position: relative;
    top: -1px;
  }

</style>
