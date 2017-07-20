<template>

  <th scope="col" :style="{ textAlign: align }">
    <button v-if="sortable" class="header-text" @click="setSortOrder">
      <span>{{ text }}</span>
      <span class="icon-wrapper" v-if="sortable">
        <mat-svg
          class="icon"
          :class="{ sorted: sortedDescending }"
          category="hardware"
          name="keyboard_arrow_down"
        />
        <mat-svg
          class="icon"
          :class="{ sorted: sortedAscending }"
          category="hardware"
          name="keyboard_arrow_up"
        />
      </span>
      <span class="visuallyhidden" v-if="sortedAscending">{{ $tr('ascending') }}</span>
      <span class="visuallyhidden" v-if="sortedDescending">{{ $tr('descending') }}</span>
    </button>
    <div v-else class="header-text">{{ text }}</div>
  </th>

</template>


<script>

  const reportGetters = require('../../../state/getters/reports');
  const reportConstants = require('../../../reportConstants');
  const reportActions = require('../../../state/actions/reports');

  module.exports = {
    $trNameSpace: 'headerCell',
    $trs: {
      ascending: '(sorted ascending)',
      descending: '(sorted descending)',
    },
    props: {
      text: {
        type: String,
        required: true,
      },
      align: {
        type: String,
      },
      sortable: {
        type: Boolean,
        default: false,
      },
      column: {
        type: String,
      },
    },
    computed: {
      sorted() {
        return this.column === this.sortColumn &&
          (this.sortOrder && this.sortOrder !== reportConstants.SortOrders.NONE);
      },
      sortedDescending() {
        return this.sorted && this.sortOrder === reportConstants.SortOrders.DESCENDING;
      },
      sortedAscending() {
        return this.sorted && this.sortOrder === reportConstants.SortOrders.ASCENDING;
      },
    },
    methods: {
      setSortOrder() {
        let sortOrder;
        if (!this.sorted) {
          // If not currently sorted, sort descending
          sortOrder = reportConstants.SortOrders.DESCENDING;
        } else if (this.sortedDescending) {
          sortOrder = reportConstants.SortOrders.ASCENDING;
        } else {
          sortOrder = reportConstants.SortOrders.NONE;
        }
        this.setReportSorting(this.column, sortOrder);
      },
    },
    vuex: {
      getters: {
        sortColumn: reportGetters.sortColumn,
        sortOrder: reportGetters.sortOrder,
      },
      actions: {
        setReportSorting: reportActions.setReportSorting,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  $size = 15px

  th
    white-space: nowrap
    vertical-align: middle
    border-bottom: 1px solid $core-text-annotation
    font-weight: normal

  .header-text
    border: none
    display: block
    color: $core-text-annotation

  .icon-wrapper
    display: inline-block
    position: relative
    height: $size
    width: $size

  .icon
    height: $size
    width: $size
    position: absolute
    left: 0
    top: 4px
    transition: opacity $core-time ease
    opacity: 0

  .sorted
    opacity: 100

</style>
