<template>

  <th scope="col" :style="{ textAlign: align }">
    <button v-if="sortable" class="header-text no-padding" @click="setSortOrder">
      <span>{{ text }}</span>
      <span v-if="sortable" class="icon-wrapper">
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
      <span v-if="sortedAscending" class="visuallyhidden">{{ $tr('ascending') }}</span>
      <span v-if="sortedDescending" class="visuallyhidden">{{ $tr('descending') }}</span>
    </button>
    <div v-else class="header-text">{{ text }}</div>
  </th>

</template>


<script>

  import { mapState, mapMutations } from 'vuex';
  import { SortOrders } from '../../../constants/reportConstants';

  export default {
    name: 'HeaderCell',
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
      ...mapState('reports', ['sortColumn', 'sortOrder']),
      sorted() {
        return (
          this.column === this.sortColumn && (this.sortOrder && this.sortOrder !== SortOrders.NONE)
        );
      },
      sortedDescending() {
        return this.sorted && this.sortOrder === SortOrders.DESCENDING;
      },
      sortedAscending() {
        return this.sorted && this.sortOrder === SortOrders.ASCENDING;
      },
    },
    methods: {
      ...mapMutations('reports', {
        setReportSorting: 'SET_REPORT_SORTING',
      }),
      setSortOrder() {
        let sortOrder;
        if (!this.sorted) {
          // If not currently sorted, sort descending
          sortOrder = SortOrders.DESCENDING;
        } else if (this.sortedDescending) {
          sortOrder = SortOrders.ASCENDING;
        } else {
          sortOrder = SortOrders.NONE;
        }
        this.setReportSorting({ sortColumn: this.column, sortOrder });
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  $size: 15px;

  .icon-wrapper {
    position: relative;
    display: inline-block;
    width: $size;
    height: $size;
  }

  .icon {
    position: absolute;
    top: 4px;
    left: 0;
    width: $size;
    height: $size;
    opacity: 0;
    transition: opacity $core-time ease;
  }

  .sorted {
    opacity: 1;
  }

  .no-padding {
    padding: 0;
  }

</style>
