<template>

  <div class="row">
    <k-checkbox
      :label="$tr('select')"
      :showLabel="false"
      :checked="checked"
      :indeterminate="indeterminate"
      :disabled="disabled"
      @change="$emit('changeselection', node)"
    />

    <div class="title">
      <content-icon :kind="node.kind" />
      <k-button
        v-if="showButton"
        :text="node.title"
        appearance="basic-link"
        @click="$emit('selecttopic', node)"
        name="select-node"
      />
      <span v-else>
        {{ node.title }}
      </span>
    </div>

    <div class="message">
      {{ message }}
    </div>
  </div>

</template>


<script>

  import contentIcon from 'kolibri.coreVue.components.contentIcon';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kCheckbox from 'kolibri.coreVue.components.kCheckbox';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';

  export default {
    name: 'contentNodeRow',
    components: {
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
      showButton() {
        return !this.disabled && this.node.kind === ContentNodeKinds.TOPIC;
      }
    },
    $trs: {
      select: 'Select',
    },
  }

</script>


<style lang="stylus" scoped></style>
