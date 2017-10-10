<template>

  <div class="row">
    <k-checkbox
      :label="$tr('select')"
      :showLabel="false"
      :checked="checked"
      :indeterminate="indeterminate"
      :disabled="disabled"
      @change="$emit('changeselection')"
    />

    <div class="title">
      <content-icon :kind="node.kind" />
      <k-button
        v-if="node.kind === 'topic'"
        :text="node.title"
        appearance="basic-link"
        @click="goToTopic(node.id)"
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

  export default {
    name: 'contentNodeRow',
    components: {
      contentIcon,
      kButton,
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
    methods: {
      goToTopic(topicId) {
        console.log(topicId);
      },
    },
    $trs: {
      select: 'Select',
    },
  }

</script>


<style lang="stylus" scoped></style>
