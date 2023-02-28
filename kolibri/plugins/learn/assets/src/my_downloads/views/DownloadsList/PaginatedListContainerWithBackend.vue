<template>

  <div>
    <KGrid>
      <KGridItem :layout12="{ span: 7 }">
        <slot name="otherFilter"></slot>
      </KGridItem>
      <KGridItem
        :layout12="{ span: 5, alignment: 'right' }"
        class="text-filter"
      >
        <slot name="filter"></slot>
      </KGridItem>
    </KGrid>

    <div>
      <slot>
      </slot>
    </div>

    <nav class="pagination-nav">
      <span dir="auto" class="pagination-label">
        {{ $translate('pagination', { visibleStartRange, visibleEndRange, numFilteredItems }) }}
      </span>
      <KButtonGroup>
        <KIconButton
          :ariaLabel="$translate('previousResults')"
          :disabled="previousButtonDisabled"
          size="small"
          icon="back"
          @click="changePage(-1)"
        />
        <KIconButton
          :ariaLabel="$translate('nextResults')"
          :disabled="nextButtonDisabled"
          size="small"
          icon="forward"
          @click="changePage(+1)"
        />
      </KButtonGroup>
    </nav>
  </div>

</template>


<script>

  import clamp from 'lodash/clamp';
  import PaginatedListContainer from 'kolibri.coreVue.components.PaginatedListContainer';
  import { crossComponentTranslator } from 'kolibri.utils.i18n';

  export default {
    name: 'PaginatedListContainerWithBackend',
    props: {
      itemsPerPage: {
        type: Number,
        required: true,
      },
      totalPageNumber: {
        type: Number,
        required: true,
      },
      value: {
        type: Number,
        required: true,
      },
      numFilteredItems: {
        type: Number,
        required: true,
      },
    },
    computed: {
      startRange() {
        return (this.value - 1) * this.itemsPerPage;
      },
      visibleStartRange() {
        return Math.min(this.startRange + 1, this.numFilteredItems);
      },
      endRange() {
        return this.value * this.itemsPerPage;
      },
      visibleEndRange() {
        return Math.min(this.endRange, this.numFilteredItems);
      },
      previousButtonDisabled() {
        return this.value === 1 || this.numFilteredItems === 0;
      },
      nextButtonDisabled() {
        return (
          this.totalPageNumber === 1 ||
          this.value === this.totalPageNumber ||
          this.numFilteredItems === 0
        );
      },
    },
    beforeCreate() {
      this.$translator = crossComponentTranslator(PaginatedListContainer);
    },
    methods: {
      changePage(change) {
        // Clamp the newPage number between the bounds if browser doesn't correctly
        // disable buttons (see #6454 issue with old versions of MS Edge)
        this.$emit('input', clamp(this.value + change, 1, this.totalPageNumber));
      },
      $translate(msg, params) {
        return this.$translator.$tr(msg, params);
      },
    },
  };

</script>


<style lang="scss" scoped>

  .pagination-nav {
    margin-bottom: 8px;
    text-align: right;
  }

  .text-filter {
    margin-top: 14px;
  }

  .pagination-label {
    position: relative;
    top: -2px;
    display: inline;
  }

</style>
