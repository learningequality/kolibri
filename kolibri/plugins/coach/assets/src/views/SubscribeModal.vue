<template>

  <KModal
    :title="$tr('modalTitle', { collectionName: selectedSubscriptions})"
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
        'displayModal',
        'saveSubscription',
        'getChannelsFromDatabase',
        'testMethod',
      ]),
      // getSubscribedChannels() {
      //   return this.getChannelsFromDatabase(this.collectionId);
      // },
      //
      // setCheckBoxes() {
      //   channels.filter(channel => getSubscribedChannels());
      // },
      isChecked(id) {
        let jsonSubs = JSON.parse(this.selectedSubscriptions);
        jsonSubs.includes(id);
        //this.addToSelectedArray(id, true);
        return jsonSubs.includes(id);
      },
      addToSelectedArray(id, checked) {
        if (checked) {
          this.selectedChannels.push(id);
        } else {
          this.selectedChannels.splice(this.selectedChannels.indexOf(id), 1);
        }
      },
      saveSelectedSubscriptions() {
        this.saveSubscription({
          id: this.collectionId,
          choices: '["a9b25ac9814742c883ce1b0579448337",456]',
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
