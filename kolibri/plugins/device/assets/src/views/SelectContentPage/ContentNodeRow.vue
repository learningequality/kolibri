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
        <KRouterLink
          v-if="isTopic"
          name="select-node"
          :text="node.title"
          :to="getLinkObject(node)"
        />
        <span v-else dir="auto">
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
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';

  export default {
    name: 'ContentNodeRow',
    components: {
      CoachContentLabel,
      ContentIcon,
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
      getLinkObject: {
        type: Function,
        required: true,
      },
    },
    computed: {
      isTopic() {
        return this.node.kind === ContentNodeKinds.TOPIC;
      },
    },
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
