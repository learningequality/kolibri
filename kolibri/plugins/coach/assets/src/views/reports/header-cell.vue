<template>

  <th scope="col">
    <button v-if="sortable" class="header-text" @click="$emit('click')">
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
          :class="{ sorted: !sortedDescending }"
          category="hardware"
          name="keyboard_arrow_up"
        />
      </span>
      <span class="visuallyhidden" v-if="!sortedDescending">{{ $tr('ascending') }}</span>
      <span class="visuallyhidden" v-if="sortedDescending">{{ $tr('descending') }}</span>
    </button>
    <div v-else class="header-text">{{ text }}</div>
  </th>

</template>


<script>

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
      sortable: {
        type: Boolean,
        default: false,
      },
      sorted: {
        type: Boolean,
      },
      sortedDescending: {
        type: Boolean,
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
