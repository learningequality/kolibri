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

  const Constants = require('../../../state/constants');
  const genLink = require('../genLink');
  const values = require('lodash.values');

  module.exports = {
    $trNameSpace: 'header-cell',
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
          return values(Constants.TableColumns).includes(value);
        },
      },
    },
    computed: {
      Constants() {
        return Constants;
      },
      sortable() {
        return this.pageState.all_or_recent !== Constants.AllOrRecent.RECENT;
      },
      sorted() {
        return this.sortable && this.pageState.sort_column === this.column;
      },
      isDescending() {
        return this.sorted && this.pageState.sort_order === Constants.SortOrders.DESCENDING;
      },
      isAscending() {
        return this.sorted && this.pageState.sort_order === Constants.SortOrders.ASCENDING;
      },
      nextSortState() {
        if (!this.sorted || this.pageState.sort_order === Constants.SortOrders.NONE) {
          return Constants.SortOrders.DESCENDING;
        }
        if (this.pageState.sort_order === Constants.SortOrders.DESCENDING) {
          return Constants.SortOrders.ASCENDING;
        }
        return Constants.SortOrders.NONE;
      },
      vLink() {
        const link = genLink(this.pageState, {
          sort_column: this.column,
          sort_order: this.nextSortState,
        });
        link.replace = true; // browser history replace-state
        return link;
      },
    },
    vuex: {
      getters: {
        pageState: state => state.pageState,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

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
