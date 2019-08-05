<template>

  <tr>
    <td class="core-table-checkbox-col">
      <KCheckbox
        :label="node.title"
        :showLabel="false"
        :checked="checked"
        :indeterminate="indeterminate"
        :disabled="disabled"
        @change="$emit('changeselection', node)"
      />
    </td>

    <td class="title">
      <KLabeledIcon>
        <ContentIcon
          slot="icon"
          :kind="node.kind"
        />
        <KButton
          v-if="showButton"
          :text="node.title"
          appearance="basic-link"
          name="select-node"
          @click="$emit('clicktopic', node)"
        />
        <span v-else>
          {{ node.title }}
        </span>
        <CoachContentLabel
          class="coach-content-label"
          :value="node.num_coach_contents"
          :isTopic="isTopic"
        />
      </KLabeledIcon>

    </td>

    <td class="message">
      {{ message }}
    </td>
  </tr>

</template>


<script>

  import ContentIcon from 'kolibri.coreVue.components.ContentIcon';
  import CoachContentLabel from 'kolibri.coreVue.components.CoachContentLabel';
  import KButton from 'kolibri.shared.KButton';
  import KCheckbox from 'kolibri.shared.KCheckbox';
  import KLabeledIcon from 'kolibri.shared.KLabeledIcon';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';

  export default {
    name: 'ContentNodeRow',
    components: {
      CoachContentLabel,
      ContentIcon,
      KButton,
      KCheckbox,
      KLabeledIcon,
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
    $trs: {},
  };

</script>


<style lang="scss" scoped>

  .coach-content-label {
    display: inline-block;
    margin-left: 16px;
    vertical-align: bottom;
  }

  .title {
    width: 60%;
  }

  .message {
    width: 40%;
    text-align: right;
  }

</style>
