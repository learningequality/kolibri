<template>

  <div v-if="channel" class="manage-channel-page">
    <NewChannelVersionBanner v-if="newVersionAvailable" />

    <div style="text-align: right">
      <KButton
        :text="$tr('importMoreAction')"
        @click="shownModal = 'IMPORT_MORE'"
      />
    </div>

    <ChannelContentsSummary :channel="channel" />

    <transition mode="out-in">
      <KLinearLoader v-if="!currentNode" :delay="false" />
      <ContentTreeViewer
        v-else
        :node="currentNode"
        :manageMode="true"
        :style="{ borderBottomColor: $themeTokens.fineLine }"
      />
    </transition>

    <DeleteResourcesModal
      v-if="shownModal === 'DELETE'"
      @cancel="closeModal"
      @submit="handleDeleteSubmit"
    />

    <SelectDriveModal
      v-if="shownModal === 'EXPORT'"
      :manageMode="true"
      :exportFileSize="resourceCounts.fileSize"
      @cancel="closeModal"
      @submit="handleExportSubmit"
    />

    <SelectTransferSourceModal
      v-if="shownModal === 'IMPORT_MORE'"
      :manageMode="true"
      :pageName.sync="selectSourcePageName"
      @cancel="closeModal"
      @submit="handleSelectImportMoreSource"
    />

    <SelectionBottomBar
      objectType="resource"
      actionType="manage"
      :resourceCounts="resourceCounts"
      :disabled="!Boolean(currentNode) || disableBottomBar"
      @selectoption="shownModal = $event"
    />

  </div>

</template>


<script>

  // Page where user can view a downloaded channel and Export and Delete items.
  // Provides path to "Import More" workflow for the channel.

  // Tries to decouple as much as possible from manageContent/wizard Vuex, but
  // shares the wizard.nodesForTransfer state.

  import get from 'lodash/get';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import ChannelContentsSummary from '../../SelectContentPage/ChannelContentsSummary';
  import ContentTreeViewer from '../../SelectContentPage/ContentTreeViewer';
  import DeleteResourcesModal from '../../SelectContentPage/DeleteResourcesModal';
  import NewChannelVersionBanner from '../NewChannelVersionBanner';
  import SelectDriveModal from '../SelectTransferSourceModal/SelectDriveModal';
  import SelectionBottomBar from '../SelectionBottomBar';
  import SelectTransferSourceModal from '../SelectTransferSourceModal';
  import taskNotificationMixin from '../../taskNotificationMixin';
  import { ContentSources } from '../../../constants';

  import { fetchPageData, fetchNodeWithAncestors, startExportTask, startDeleteTask } from './api';

  export default {
    name: 'ManageChannelContentsPage',
    metaInfo() {
      if (this.channel) {
        return {
          title: this.title,
        };
      }
      return {};
    },
    components: {
      ChannelContentsSummary,
      ContentTreeViewer,
      DeleteResourcesModal,
      NewChannelVersionBanner,
      SelectDriveModal,
      SelectionBottomBar,
      SelectTransferSourceModal,
    },
    mixins: [commonCoreStrings, taskNotificationMixin],
    data() {
      return {
        channel: null,
        currentNodeId: null,
        freeSpace: null,
        shownModal: null,
        nodeCache: {},
        studioChannel: null,
        selectSourcePageName: null,
        disableBottomBar: false,
        watchedTaskType: null,
      };
    },
    computed: {
      channelId() {
        return this.$route.params.channel_id;
      },
      selections() {
        // TODO decouple this workflow entirely from vuex
        const nodes = this.$store.state.manageContent.wizard.nodesForTransfer;
        return {
          included: nodes.included.map(x => x.id),
          excluded: nodes.omitted.map(x => x.id),
        };
      },
      title() {
        return this.$tr('title', { channelName: this.channel.name });
      },
      newVersionAvailable() {
        return get(this.studioChannel, 'version') > get(this.channel, 'version');
      },
      currentNode() {
        return this.nodeCache[this.currentNodeId];
      },
      resourceCounts() {
        // TODO decouple this workflow entirely from vuex
        const { resources, fileSize } = this.$store.getters[
          'manageContent/wizard/nodeTransferCounts'
        ]('localexport');
        return {
          count: resources,
          fileSize,
        };
      },
    },
    watch: {
      '$route.query.node': {
        handler(newVal) {
          this.updateNode(newVal);
        },
        deep: true,
      },
    },
    beforeRouteLeave(to, from, next) {
      this.$store.commit('manageContent/wizard/RESET_NODE_LISTS');
      next();
    },
    beforeMount() {
      this.$store.commit('coreBase/SET_APP_BAR_TITLE', this.coreString('loadingLabel'));
      this.fetchPageData(this.channelId)
        .then(pageData => {
          this.setUpPage(pageData);
        })
        .catch(error => {
          this.$store.dispatch('handleApiError', error);
        });
    },
    methods: {
      setUpPage({ freeSpace, channel, studioChannel }) {
        this.freeSpace = freeSpace;
        this.channel = { ...channel };
        if (studioChannel) {
          this.studioChannel = { ...studioChannel };
        }
        this.$store.commit('coreBase/SET_APP_BAR_TITLE', this.title);
        return this.updateNode(this.$route.query.node || channel.root);
      },
      updateNode(newNodeId) {
        if (!newNodeId) {
          this.updateNode(this.channel.root);
        } else if (this.nodeCache[newNodeId]) {
          this.currentNodeId = newNodeId;
        } else {
          this.currentNodeId = null;
          this.fetchNodeWithAncestors(newNodeId)
            .then(node => {
              this.nodeCache[newNodeId] = node;
              this.currentNodeId = newNodeId;
            })
            .catch(error => {
              this.$store.dispatch('handleApiError', error);
            });
        }
      },
      handleDeleteSubmit({ deleteEverywhere }) {
        this.beforeTask();
        this.startDeleteTask({
          deleteEverywhere,
          channelId: this.channelId,
          included: this.selections.included,
          excluded: this.selections.excluded,
        }).then(this.onTaskSuccess, this.onTaskFailure);
      },
      handleExportSubmit({ driveId }) {
        this.beforeTask();
        this.startExportTask({
          driveId,
          channelId: this.channelId,
          included: this.selections.included,
          excluded: this.selections.excluded,
        }).then(this.onTaskSuccess, this.onTaskFailure);
      },
      beforeTask() {
        this.closeModal();
        this.disableBottomBar = true;
      },
      onTaskSuccess(task) {
        this.disableBottomBar = false;
        this.watchedTaskType = task.entity.type;
        this.notifyAndWatchTask(task);
      },
      onTaskFailure() {
        this.disableBottomBar = false;
        this.createTaskFailedSnackbar();
      },
      handleSelectImportMoreSource(params) {
        // The modal will only emit 'submit' events at the very end of the wizard.
        // This method will send user to the correct URL for SELECT_CONTENT, depending
        // on whether we are importing more from studio/drive/p2p.
        // Page changes for multi-step wizards are handled by the modal's nextStep method.
        const baseLinkObject = {
          name: 'SELECT_CONTENT',
          params: {
            channel_id: this.channelId,
          },
          query: {
            last: 'MANAGE_CHANNEL',
          },
        };

        if (params.source === ContentSources.LOCAL_DRIVE) {
          baseLinkObject.query.drive_id = params.drive_id;
        } else if (params.source === ContentSources.PEER_KOLIBRI_SERVER) {
          baseLinkObject.query.address_id = params.address_id;
        }

        this.$router.push(baseLinkObject);
      },
      closeModal() {
        this.shownModal = null;
      },
      // @public (used by taskNotificationMixin)
      onWatchedTaskFinished() {
        // For exports, there are no side effects once task has finished.
        if (this.watchedTaskType !== 'DELETECHANNEL') return;

        // clear out the nodeCache
        this.nodeCache = {};
        // clear out selections
        this.$store.commit('manageContent/wizard/RESET_NODE_LISTS');
        // refresh the data on this page. if the entire channel ends up
        // being deleted, then redirect to upper page
        this.fetchPageData(this.channelId)
          .then(this.setUpPage)
          .catch(error => {
            // If entire channel is deleted, redirect
            if (error.status.code === 404) {
              this.$router.replace({ name: 'MANAGE_CONTENT_PAGE' });
            } else {
              this.$store.dispatch('handleApiError', error);
            }
          });
      },
      fetchPageData,
      fetchNodeWithAncestors,
      startExportTask,
      startDeleteTask,
    },
    $trs: {
      title: `Manage '{channelName}'`,
      importMoreAction: 'Import more',
    },
  };

</script>


<style lang="scss" scoped>

  .manage-channel-page {
    min-height: 80vh;
  }

</style>
