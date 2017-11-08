<template>

  <th scope="row">
    <div class="wrapper">
      <content-icon :kind="kind" class="icon" />
      <k-router-link v-if="link" :text="title" :to="link" class="link" />
      <span v-else>{{ title }}</span>
    </div>
    <div class="wrapper">
      <slot name="details"></slot>
    </div>
  </th>

</template>


<script>

  import { validateLinkObject } from 'kolibri.utils.validators';
  import contentIcon from 'kolibri.coreVue.components.contentIcon';
  import kRouterLink from 'kolibri.coreVue.components.kRouterLink';

  export default {
    components: { contentIcon, kRouterLink },
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
