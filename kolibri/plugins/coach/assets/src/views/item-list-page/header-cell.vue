<template>

  <th scope="col">
    <router-link v-if="sortable" :to="vLink" class="header-text">
      <span>{{ text }}</span>
      <span class="icon-wrapper" v-if="sortable">
        <mat-svg class="icon" :class="{ sorted: isDescending }" category="hardware" name="keyboard_arrow_down"/>
        <mat-svg class="icon" :class="{ sorted: isAscending }" category="hardware" name="keyboard_arrow_up"/>
      </span>
      <span class="visuallyhidden" v-if="isAscending">{{ $tr('ascending') }}</span>
      <span class="visuallyhidden" v-if="isDescending">{{ $tr('descending') }}</span>
    </router-link>
    <div v-else class="header-text">{{ text }}</div>
  </th>

</template>


<script>

  const ReportConstants = require('../../reportConstants');
  const reportGetters = require('../../state/getters/reports');
  const values = require('lodash/values');

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
      column: {
        type: String,
        required: true,
        validator(value) {
          return values(ReportConstants.TableColumns).includes(value);
        },
      },
    },
    computed: {
      sortable() {
        return false; // TODO - disable sorting until it's fully implemented
        // return !this.isRecentPage;
      },
      sorted() {
        return this.sortable && this.pageState.sortColumn === this.column;
      },
      isDescending() {
        return this.sorted && this.pageState.sortOrder === ReportConstants.SortOrders.DESCENDING;
      },
      isAscending() {
        return this.sorted && this.pageState.sortOrder === ReportConstants.SortOrders.ASCENDING;
      },
      nextSortState() {
        if (!this.sorted || this.pageState.sortOrder === ReportConstants.SortOrders.NONE) {
          return ReportConstants.SortOrders.DESCENDING;
        }
        if (this.pageState.sortOrder === ReportConstants.SortOrders.DESCENDING) {
          return ReportConstants.SortOrders.ASCENDING;
        }
        return ReportConstants.SortOrders.NONE;
      },
      vLink() {
        // todo
        return {
          name: '',
          params: {},
          replace: true, // replace state
        };
      },
    },
    vuex: {
      getters: {
        pageName: state => state.pageName,
        pageState: state => state.pageState,
        isRecentPage: reportGetters.isRecentPage,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  $size = 15px

  th
    white-space: nowrap
    vertical-align: center
    border-bottom: 1px solid $core-text-annotation
    font-weight: normal

  .header-text
    text-decoration: none
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
