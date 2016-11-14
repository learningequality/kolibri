<template>

  <th scope="col">
    <a v-if="sortable" v-link="vLink" class="header-text">
      <span>{{ text }}</span>
      <span class="sort-wrapper" v-if="sortable" role="presentation">
        <svg class="icon" :class="{ sorted: isDescending }" src="./down.svg"></svg>
        <svg class="icon" :class="{ sorted: isAscending }" src="./up.svg"></svg>
      </span>
      <span class="visuallyhidden" v-if="isAscending">{{ $tr('ascending') }}</span>
      <span class="visuallyhidden" v-if="isDescending">{{ $tr('descending') }}</span>
    </a>
    <div v-else class="header-text">{{ text }}</div>
  </th>

</template>


<script>

  const Constants = require('../../../state/constants');
  const genLink = require('../genLink');

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
          return Constants.enumerate(Constants.TableColumns).includes(value);
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
        return genLink(this.pageState, {
          sort_column: this.column,
          sort_order: this.nextSortState,
        });
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

  .header-text
    text-decoration: none
    display: block
    color: $core-text-default

  .sort-wrapper
    display: inline-block
    position: relative
    height: $size
    width: $size

  .icon
    height: $size
    width: $size
    position: absolute
    top: 2px
    left: 0
    transition: opacity $core-time ease
    opacity: 0

  .sorted
    opacity: 100

</style>
