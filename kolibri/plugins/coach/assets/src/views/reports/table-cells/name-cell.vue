<template>

  <td scope="row" class="core-table-main-col">
    <div class="title">
      <div>
        <k-router-link v-if="link" :text="title" :to="link" class="link" />
        <span v-else>{{ title }}</span>
      </div>
      <div>
        <slot name="details"></slot>
      </div>
    </div>
    <coach-content-label
      class="coach-content-label"
      :value="numCoachContents"
    />
  </td>

</template>


<script>

  import { validateLinkObject } from 'kolibri.utils.validators';
  import coachContentLabel from 'kolibri.coreVue.components.coachContentLabel';
  import contentIcon from 'kolibri.coreVue.components.contentIcon';
  import kRouterLink from 'kolibri.coreVue.components.kRouterLink';

  export default {
    name: 'nameCell',
    components: {
      coachContentLabel,
      contentIcon,
      kRouterLink,
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
      numCoachContents: {
        type: Number,
        default: 0,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .title
    display: inline-block

  .coach-content-label
    display: inline-block
    vertical-align: bottom
    margin-left: 8px

</style>
