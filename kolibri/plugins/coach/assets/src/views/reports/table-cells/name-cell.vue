<template>

  <th scope="row">
    <div class="wrapper">
      <content-icon :kind="kind" class="icon"/>
      <router-link v-if="link" :to="link" class="link">{{ title }}</router-link>
      <span v-else>{{ title }}</span>
    </div>
    <div class="wrapper">
      <slot name="details" />
    </div>
  </th>

</template>


<script>

  const validateLinkObject = require('kolibri.utils.validateLinkObject');

  module.exports = {
    components: {
      'content-icon': require('kolibri.coreVue.components.contentIcon'),
    },
    props: {
      kind: {
        type: String,
        required: true,
      },
      title: {
        type: String,
        required: true,
      },
      link: {
        type: Object,
        validator: validateLinkObject,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  th
    text-align: left

  .wrapper
    font-weight: normal
    position: relative
    text-align: left
    padding: 2px 0 0 25px
    color: $core-text-annotation

  .hasicon
    padding-left: 20px

  .icon
    position: absolute
    left: 0
    fill: $core-text-default
    font-size: 1.25em

  .link
    font-weight: bold

</style>
