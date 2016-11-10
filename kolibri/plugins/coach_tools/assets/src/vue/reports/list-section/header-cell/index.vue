<template>

  <th
    scope="col"
    :class="headerClass"
    :role="headerRole"
    :tabindex="headerTabIndex"
    @keydown.enter.space="emitClick"
  >
    <span class="block">{{ text }}</span>
    <span class="block icon-wrapper" v-if="sortable">
      <svg class="icon" v-if="isDescending" src="./down.svg"></svg>
      <svg class="icon" v-if="isAscending" src="./up.svg"></svg>
    </span>
  </th>

</template>


<script>

  const SortOrders = require('../../../../state/constants').SortOrders;

  module.exports = {
    props: {
      text: {
        type: String,
        required: true,
      },
      sortable: {
        type: Boolean,
        default: true,
      },
      sort: {
        type: String,
        default: null,
        validator(value) {
          return value === SortOrders.ASC || value === SortOrders.DESC || value === null;
        },
      },
    },
    methods: {
      emitClick(event) {
        event.target.click();
      },
    },
    computed: {
      headerClass() {
        return this.sortable ? 'sortable' : '';
      },
      headerRole() {
        return this.sortable ? 'button' : '';
      },
      headerTabIndex() {
        return this.sortable ? 0 : -1;
      },
      isDescending() {
        return this.sort === SortOrders.DESC;
      },
      isAscending() {
        return this.sort === SortOrders.ASC;
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

  th
    white-space: nowrap
    vertical-align: center

  .sortable
    cursor: pointer
    color: $core-action-normal
    transition: all $core-time ease-out
    svg
      fill: $core-action-normal
    &:hover
      color: $core-action-dark
      svg
        fill: $core-action-dark

  .block
    display: inline-block

  .icon-wrapper
    width: 15px

  .icon
    height: 15px
    width: 15px
    position: relative
    top: 2px

</style>
