<template>

  <KModal
    :title="$tr('modalTitle', { collectionName: collectionName })"
    :submitText="$tr('saveSelectionsButtonName')"
    :cancelText="$tr('cancel')"
    @submit="saveSubscriptions"
    @cancel="close"
  >
    <KCheckbox
      v-for="channel in channels"
      :key="channel.id"
      :label="channel.title"
      :checked="true"
    />
    <p>{{ $tr('description') }}</p>
  </KModal>

</template>


<script>

  import { mapGetters } from 'vuex';
  import KModal from 'kolibri.coreVue.components.KModal';
  import KCheckbox from 'kolibri.coreVue.components.KCheckbox';

  export default {
    name: 'SubscribeModal',
    $trs: {
      modalTitle: 'Channel subscriptions for { collectionName }',
      saveSelectionsButtonName: 'Save',
      cancel: 'Cancel',
      description: 'Chosen channels will be available to all members of the class',
    },
    components: {
      KModal,
      KCheckbox,
    },
    props: {
      collectionName: {
        type: String,
        required: true,
      },
      collectionId: {
        type: String,
        required: true,
      },
    },
    computed: {
      ...mapGetters({
        channels: 'getChannels',
      }),
    },
    methods: {
      saveSubscriptions() {
        this.modalShown = null;
      },
      close() {
        this.modalShown = null;
      },
    },
  };

</script>


<style lang="scss" scoped>

  p {
    word-break: keep-all;
  }

</style>
