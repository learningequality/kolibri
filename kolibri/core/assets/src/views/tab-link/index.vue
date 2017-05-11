<template>

  <li>
    <router-link
      :to="link"
      class="tab"
      :class="{ selected: selected, 'tab-icon-title': icon && title }">

      <div
        v-if="icon"
        class="tab-icon"
      >
        <ui-icon
          :icon="icon"
          class="icon"
        />
      </div>

      <div
        v-if="title"
        class="tab-title">
        {{ title }}
      </div>

    </router-link>
  </li>

</template>


<script>

  module.exports = {
    props: {
      title: {
        type: String,
        required: false,
      },
      icon: {
        type: String,
        required: false,
      },
      link: {
        type: [String, Object],
        required: true,
      },
      selected: {
        type: Boolean,
        default: false,
      },
    },
    components: {
      'ui-icon': require('keen-ui/src/UiIcon'),
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  li
    display: inline-block
    text-align: center

  .tab
    display: inline-block
    padding-right: 12px
    padding-left: 12px
    max-width: 264px
    min-width: 72px
    font-size: 14px
    text-decoration: none
    color: $core-text-annotation
    &:hover, &:focus
      background-color: $core-action-light
      color: $core-action-normal


  .selected
    border-bottom-style: solid
    border-bottom-width: 2px
    border-bottom-color: $core-action-normal
    color: $core-action-normal

  .icon
    font-size: 24px

  .tab-icon
    padding-top: 11px
    padding-bottom: 11px


  .tab-title
    font-weight: bold
    text-transform: uppercase
    padding-top: 15px
    padding-bottom: 15px
    overflow-x: hidden
    text-overflow: ellipsis

  .tab-icon-title

    .tab-icon
      padding-top: 10px
      padding-bottom: 10px

    .tab-title
      padding-top: 0
      padding-bottom: 10px

</style>
