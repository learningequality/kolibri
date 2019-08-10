<template>

  <KModal
    :title="$tr('title')"
    :submitText="coreString('deleteAction')"
    :cancelText="coreString('cancelAction')"
    @submit="$emit('submit')"
    @cancel="$emit('cancel')"
  >
    <p>{{ $tr('confirmationQuestion', { channelTitle }) }}</p>
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'DeleteChannelModal',
    mixins: [commonCoreStrings],
    props: {
      channelTitle: {
        type: String,
        required: true,
      },
    },
    $trs: {
      confirmationQuestion: `Are you sure you want to delete '{ channelTitle }' from your device?`,
      title: 'Delete channel',
    },
  };

</script>


<style lang="scss" scoped></style>
