<template>

  <tr>
    <td class="core-table-checkbox-col">
      <k-checkbox
        class="checkbox display-cell"
        :label="node.title"
        :showLabel="false"
        :checked="checked"
        :indeterminate="indeterminate"
        :disabled="disabled"
        @change="$emit('changeselection', node)"
      />
    </td>

    <td class="title display-cell core-table-main-col">
      <content-icon
        class="icon"
        :kind="node.kind"
      />
      <k-button
        v-if="showButton"
        :text="node.title"
        appearance="basic-link"
        @click="$emit('clicktopic', node)"
        name="select-node"
      />
      <span v-else>
        {{ node.title }}
      </span>
      <coach-content-label
        class="coach-content-label"
        :value="node.num_coach_contents"
        :isTopic="isTopic"
      />

    </td>

    <td class="message display-cell">
      {{ message }}
    </td>
  </tr>

</template>


<script>

  import contentIcon from 'kolibri.coreVue.components.contentIcon';
  import coachContentLabel from 'kolibri.coreVue.components.coachContentLabel';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kCheckbox from 'kolibri.coreVue.components.kCheckbox';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';

  export default {
    name: 'contentNodeRow',
    components: {
      coachContentLabel,
      contentIcon,
      kButton,
      kCheckbox,
    },
    props: {
      node: {
        type: Object,
        required: true,
      },
      checked: {
        type: Boolean,
        default: false,
      },
      indeterminate: {
        type: Boolean,
        default: false,
      },
      disabled: {
        type: Boolean,
        default: false,
      },
      message: {
        type: String,
        required: true,
      },
    },
    computed: {
      isTopic() {
        return this.node.kind === ContentNodeKinds.TOPIC;
      },
      showButton() {
        return !this.disabled && this.node.kind === ContentNodeKinds.TOPIC;
      },
    },
    $trs: {
      select: 'Select',
    },
  };

</script>


<style lang="stylus" scoped>

  .coach-content-label
    display: inline-block
    vertical-align: bottom
    margin-left: 16px

  .display-cell
    display: table-cell
    vertical-align: inherit

  .icon
    margin-left: 8px
    margin-right: 4px

  .title
    width: 60%

  .message
    width: 40%
    text-align: right

</style>
