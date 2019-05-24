<template>

  <KModal
    :title="$tr('modalTitle', { collectionName: collectionName })"
    :submitText="$tr('saveSelectionsButtonName')"
    :cancelText="$tr('cancel')"
    @submit="saveSelectedSubscriptions"
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

  import { mapGetters, mapActions } from 'vuex';
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
      ...mapActions('subscriptions', ['displayModal', 'saveSubscription']),
      saveSelectedSubscriptions() {
        this.saveSubscription({
          id: this.collectionId,
          choices: "['123','456']",
        });
      },
      close() {
        this.displayModal(false);
      },
    },
  };

</script>


<style lang="scss" scoped>

  p {
    word-break: keep-all;
  }

</style>
