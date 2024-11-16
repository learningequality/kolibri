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
        <template #icon>
          <ContentIcon :kind="node.kind" />
        </template>
        <KRouterLink
          v-if="isTopic"
          name="select-node"
          :text="node.title"
          :to="getLinkObject(node)"
        />
        <span
          v-else
          dir="auto"
        >
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
      <template v-if="message && !importing">
        {{ message }}
      </template>
      <ChannelUpdateAnnotations
        v-if="node.num_new_resources || importing"
        class="update-label"
        :isTopic="isTopic"
        :newResources="node.num_new_resources"
        :importing="importing"
      />
    </td>
  </tr>

</template>


<script>

  import ContentIcon from 'kolibri-common/components/labels/ContentIcon';
  import CoachContentLabel from 'kolibri-common/components/labels/CoachContentLabel';
  import { ContentNodeKinds } from 'kolibri/constants';
  import ChannelUpdateAnnotations from './ChannelUpdateAnnotations';

  export default {
    name: 'ContentNodeRow',
    components: {
      CoachContentLabel,
      ContentIcon,
      ChannelUpdateAnnotations,
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
      importing() {
        return this.node.updated_resource && !this.node.available;
      },
    },
  };

</script>


<style lang="scss" scoped>

  .coach-content-label {
    position: absolute;
    margin-left: 16px;
  }

  .title {
    width: 60%;
    overflow-x: hidden;
  }

  .message {
    width: 40%;
    text-align: right;
  }

  .update-label {
    margin-left: 24px;
  }

</style>
