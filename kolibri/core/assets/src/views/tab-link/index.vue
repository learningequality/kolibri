<template>

  <li>
    <router-link :to="link" class="tab" :class="{ 'tab-has-icon-and-title': type === 'icon-and-title' }">

      <div v-if="type === 'icon' || type === 'icon-and-title'" class="tab-icon">
        <ui-icon :icon="icon" :ariaLabel="title" class="icon"/>
      </div>

      <div v-if="type === 'title' || type === 'icon-and-title'" class="tab-title">
        {{ title }}
      </div>

    </router-link>
  </li>

</template>


<script>

  const ValidateLinkObject = require('kolibri.utils.validateLinkObject');

  module.exports = {
    props: {
      type: {
        type: String,
        validator(type) {
          return ['title', 'icon', 'icon-and-title'].includes(type);
        },
        required: true,
      },
      title: {
        type: String,
        required: () => this.type === 'title' || this.type === 'icon-and-title',
      },
      icon: {
        type: String,
        required: () => this.type === 'icon' || this.type === 'icon-and-title',
      },
      link: {
        type: Object,
        required: true,
        validator: ValidateLinkObject,
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


  .router-link-active
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

  .tab-has-icon-and-title

    .tab-icon
      padding-top: 10px
      padding-bottom: 10px

    .tab-title
      padding-top: 0
      padding-bottom: 10px

</style>
