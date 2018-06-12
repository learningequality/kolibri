<template>

  <k-modal
    :title="$tr('title')"
    :submitText="$tr('confirmButtonLabel')"
    :cancelText="$tr('cancelButtonLabel')"
    @submit="handleClickConfirm"
    @cancel="handleClickCancel"
  >
    <p>{{ $tr('confirmationQuestion', { channelTitle }) }}</p>
  </k-modal>

</template>


<script>

  import kModal from 'kolibri.coreVue.components.kModal';

  export default {
    name: 'deleteChannelModal',
    components: {
      kModal,
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
