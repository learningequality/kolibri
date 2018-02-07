<template>

  <td scope="row" class="core-table-main-col">
    <div class="wrapper">
      <k-router-link v-if="link" :text="title" :to="link" class="link" />
      <span v-else>{{ title }}</span>
    </div>
    <div class="wrapper">
      <slot name="details"></slot>
    </div>
  </td>

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

</style>
