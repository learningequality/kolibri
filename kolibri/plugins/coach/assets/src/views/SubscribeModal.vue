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
      :checked="isChecked(channel.id)"
      @change="addToSelectedArray(channel.id,$event)"
    />
    <p>{{ $tr('description') }}</p>
  </KModal>

</template>


<script>

  import { mapGetters, mapActions, mapState } from 'vuex';
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
    data() {
      return {
        selectedChannels: [],
        isSelectedChannelsInitialized: false,
      };
    },
    computed: {
      ...mapGetters({
        channels: 'getChannels',
      }),
      ...mapGetters('subscriptions', ['getSubs']),
      ...mapState('subscriptions', ['subscriptionModalShown', 'selectedSubscriptions']),
    },
    beforeMount() {
      this.getChannelsFromDatabase(this.collectionId);
    },
    methods: {
      ...mapActions('subscriptions', [
        'displaySubscriptionModal',
        'saveSubscription',
        'getChannelsFromDatabase',
        'updateGroupSubscriptions',
        'testMethod',
      ]),
      ...mapActions('userManagement', ['displayModal']),
      // getSubscribedChannels() {
      //   return this.getChannelsFromDatabase(this.collectionId);
      // },
      //
      // setCheckBoxes() {
      //   channels.filter(channel => getSubscribedChannels());
      // },
      isChecked(id) {
        let jsonSubs = JSON.parse(this.selectedSubscriptions);
        return jsonSubs.includes(id);
      },
      addToSelectedArray(id, checked) {
        if (!this.isSelectedChannelsInitialized) {
          this.selectedChannels = JSON.parse(this.selectedSubscriptions);
          this.isSelectedChannelsInitialized = true;
        }
        if (checked) {
          this.selectedChannels.push(id);
        } else {
          this.selectedChannels.splice(this.selectedChannels.indexOf(id), 1);
        }
      },
      saveSelectedSubscriptions() {
        if (this.isSelectedChannelsInitialized) {
          this.updateGroupSubscriptions(this.selectedChannels);
          this.saveSubscription({
            id: this.collectionId,
            choices: JSON.stringify(this.selectedChannels),
          });
          this.close();
        } else {
          this.close();
        }
      },
      close() {
        this.displaySubscriptionModal(false);
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
