<template>

  <core-modal
    :title="$tr('title')"
    :submitText="$tr('confirmButtonLabel')"
    :cancelText="$tr('cancelButtonLabel')"
    @submit="handleClickConfirm"
    @cancel="handleClickCancel"
  >
    <p>{{ $tr('confirmationQuestion', { channelTitle }) }}</p>
  </core-modal>

</template>


<script>

  import coreModal from 'kolibri.coreVue.components.coreModal';

  export default {
    name: 'deleteChannelModal',
    components: {
      coreModal,
    },
    props: {
      channelTitle: {
        type: String,
        required: true,
      },
    },
    methods: {
      handleClickCancel() {
        this.$emit('cancel');
      },
      handleClickConfirm() {
        this.$emit('confirm');
      },
    },
    $trs: {
      confirmationQuestion: `Are you sure you want to delete '{ channelTitle }' from your device?`,
      title: 'Delete channel',
      cancelButtonLabel: 'Cancel',
      confirmButtonLabel: 'Delete',
    },
  };

</script>


<style lang="stylus" scoped></style>
