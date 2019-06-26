<template>

  <KModal
    :title="$tr('modalTitle', { collectionName: groupName })"
    :submitText="$tr('saveSelectionsButtonName')"
    :cancelText="$tr('cancel')"
    @submit="saveSelectedSubscriptions"
    @cancel="close"
  >
    <KCheckbox
      v-for="channel in getChannels"
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
    name: 'SubscribeGroupModal',
    $trs: {
      modalTitle: "{ collectionName }'s subscriptions",
      saveSelectionsButtonName: 'Save',
      cancel: 'Cancel',
      description: 'Chosen channels will be available to all members of the class',
    },
    components: {
      KModal,
      KCheckbox,
    },
    props: {
      groupName: {
        type: String,
        required: true,
      },
      groupId: {
        type: String,
        required: true,
      },
      classId: {
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
      ...mapState('subscriptions', [
        'subscriptionModalShown',
        'selectedSubscriptions',
        'selectedGroupSubscriptions',
      ]),
      getChannels() {
        let groupChannels = [];
        let classChannels = JSON.parse(this.selectedSubscriptions);
        this.channels.forEach(function(channel) {
          if (classChannels.includes(channel.id)) {
            groupChannels.push(channel);
          }
        });
        return groupChannels;
      },
    },
    beforeMount() {
      this.getChannelsFromDatabase(this.classId);
      this.getGroupChannelsFromDatabase(this.groupId);
    },
    methods: {
      ...mapActions('subscriptions', [
        'saveSubscription',
        'saveGroupSubscription',
        'getChannelsFromDatabase',
        'getGroupChannelsFromDatabase',
      ]),
      ...mapActions('groups', ['displayModal']),
      // getSubscribedChannels() {
      //   return this.getChannelsFromDatabase(this.collectionId);
      // },
      //
      // setCheckBoxes() {
      //   channels.filter(channel => getSubscribedChannels());
      // },
      isChecked(id) {
        let jsonSubs = JSON.parse(this.selectedGroupSubscriptions);
        return jsonSubs.includes(id);
      },
      addToSelectedArray(id, checked) {
        if (!this.isSelectedChannelsInitialized) {
          this.selectedChannels = JSON.parse(this.selectedGroupSubscriptions);
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
          this.saveGroupSubscription({
            id: this.groupId,
            choices: JSON.stringify(this.selectedChannels),
          });
          this.close();
        } else {
          this.close();
        }
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
