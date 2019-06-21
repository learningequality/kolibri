<template>

  <KModal
    :title="$tr('title')"
    :submitText="$tr('confirmButtonLabel')"
    :cancelText="coreCommon$tr('cancelAction')"
    @submit="$emit('submit')"
    @cancel="$emit('cancel')"
  >
    <p>{{ $tr('confirmationQuestion', { channelTitle }) }}</p>
  </KModal>

</template>


<script>

  import KModal from 'kolibri.coreVue.components.KModal';
  import coreStringsMixin from 'kolibri.coreVue.mixins.coreStringsMixin';

  export default {
    name: 'DeleteChannelModal',
    components: {
      KModal,
    },
    mixins: [coreStringsMixin],
    props: {
      channelTitle: {
        type: String,
        required: true,
      },
    },
    $trs: {
      confirmationQuestion: `Are you sure you want to delete '{ channelTitle }' from your device?`,
      title: 'Delete channel',
      confirmButtonLabel: 'Delete',
    },
  };

</script>


<style lang="scss" scoped></style>
