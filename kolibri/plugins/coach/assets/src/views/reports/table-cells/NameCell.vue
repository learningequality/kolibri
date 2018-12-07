<template>

  <td scope="row" class="core-table-main-col">
    <div class="title">
      <div>
        <KRouterLink v-if="link" :text="title" :to="link" class="link" />
        <span v-else dir="auto">{{ title }}</span>
      </div>
      <div>
        <slot name="details"></slot>
      </div>
    </div>
    <CoachContentLabel
      class="coach-content-label"
      :value="numCoachContents"
      :isTopic="isTopic"
    />
  </td>

</template>


<script>

  import { validateLinkObject } from 'kolibri.utils.validators';
  import CoachContentLabel from 'kolibri.coreVue.components.CoachContentLabel';
  import KRouterLink from 'kolibri.coreVue.components.KRouterLink';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';

  export default {
    name: 'NameCell',
    components: {
      CoachContentLabel,
      KRouterLink,
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
    computed: {
      isTopic() {
        return this.kind === ContentNodeKinds.TOPIC || this.kind === ContentNodeKinds.CHANNEL;
      },
    },
  };

</script>


<style lang="scss" scoped>

  .title {
    display: inline-block;
  }

  .coach-content-label {
    display: inline-block;
    margin-left: 8px;
    vertical-align: bottom;
  }

</style>
