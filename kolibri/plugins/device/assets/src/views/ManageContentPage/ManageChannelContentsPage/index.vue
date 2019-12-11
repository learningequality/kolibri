<template>

  <div class="manage-channel-page">
    <!-- Show this progress bar to match other import flows -->
    <TaskProgress
      :show="!channel"
      type="DOWNLOADING_CHANNEL_CONTENTS"
      :showButtons="false"
      status="RUNNING"
    />

    <template v-if="channel">
      <NewChannelVersionBanner
        v-if="availableVersions.studioLatest > availableVersions.installed"
        class="banner"
        :version="availableVersions.studioLatest"
        @click="handleClickViewNewVersion"
      />

      <ChannelContentsSummary :channel="channel" />

      <div style="text-align: right">
        <KButton
          :text="$tr('importMoreAction')"
          style="margin: 0;"
          @click="shownModal = 'IMPORT_MORE'"
        />
      </div>

      <transition mode="out-in">
        <KLinearLoader v-if="!currentNode" :delay="false" />
        <ContentTreeViewer
          v-else
          :node="currentNode"
          :manageMode="true"
          :style="{ borderBottomColor: $themeTokens.fineLine }"
        />
      </transition>
    </template>

    <DeleteResourcesModal
      v-if="shownModal === 'DELETE'"
      :numberOfResources="resourceCounts.count"
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
      :disabled="!Boolean(currentNode) || bottomBarDisabled"
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
  import last from 'lodash/last';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import ChannelContentsSummary from '../../SelectContentPage/ChannelContentsSummary';
  import ContentTreeViewer from '../../SelectContentPage/ContentTreeViewer';
  import DeleteResourcesModal from '../../SelectContentPage/DeleteResourcesModal';
  import NewChannelVersionBanner from '../NewChannelVersionBanner';
  import SelectDriveModal from '../SelectTransferSourceModal/SelectDriveModal';
  import SelectionBottomBar from '../SelectionBottomBar';
  import SelectTransferSourceModal from '../SelectTransferSourceModal';
  import taskNotificationMixin from '../../taskNotificationMixin';
  import TaskProgress from '../TaskProgress';
  import { ContentSources, PageNames, TaskTypes, TransferTypes } from '../../../constants';

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
      TaskProgress,
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
        bottomBarDisabled: false,
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
      availableVersions() {
        // If offline, we shouldn't see an upgrade notification
        return {
          studioLatest: get(this.studioChannel, 'version', -Infinity),
          installed: get(this.channel, 'version'),
        };
      },
      currentNode() {
        return this.nodeCache[this.currentNodeId];
      },
      resourceCounts() {
        // TODO decouple this workflow entirely from vuex
        const { transferResourceCount, transferFileSize } = this.$store.state.manageContent.wizard;
        return {
          count: transferResourceCount,
          fileSize: transferFileSize,
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
      this.$store.commit('manageContent/wizard/RESET_STATE');
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
        // These need to be set for setImportExportFileSizeAndResourceCount to work
        this.$store.commit('manageContent/wizard/SET_TRANSFERRED_CHANNEL', this.channel);
        this.$store.commit('manageContent/wizard/SET_TRANSFER_TYPE', TransferTypes.LOCALEXPORT);

        this.$store.commit('coreBase/SET_APP_BAR_TITLE', this.title);
        return this.updateNode(this.$route.query.node || channel.root);
      },
      updateNode(newNodeId) {
        if (!newNodeId) {
          this.updateNode(this.channel.root);
        } else if (this.nodeCache[newNodeId]) {
          this.currentNodeId = newNodeId;
        } else {
          this.fetchNodeWithAncestors(newNodeId)
            .then(node => {
              // In case the node had its last child deleted, then automatically
              // go up a level
              if (node.children.filter(x => x.available).length === 0) {
                this.$router.replace({
                  query: {
                    node: last(node.ancestors).id,
                  },
                });
              } else {
                this.$set(this.nodeCache, newNodeId, node);
                this.currentNodeId = newNodeId;
              }
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
        this.bottomBarDisabled = true;
      },
      onTaskSuccess(task) {
        this.bottomBarDisabled = false;
        this.watchedTaskType = task.entity.type;
        this.notifyAndWatchTask(task);
      },
      onTaskFailure() {
        this.bottomBarDisabled = false;
        this.createTaskFailedSnackbar();
      },
      handleClickViewNewVersion() {
        this.$router.push({
          name: PageNames.NEW_CHANNEL_VERSION_PAGE,
        });
      },
      handleSelectImportMoreSource(params) {
        // The modal will only emit 'submit' events at the very end of the wizard.
        // This method will send user to the correct URL for SELECT_CONTENT, depending
        // on whether we are importing more from studio/drive/p2p.
        // Page changes for multi-step wizards are handled by the modal's nextStep method.
        const baseLinkObject = {
          name: PageNames.SELECT_CONTENT,
          params: {
            channel_id: this.channelId,
          },
          query: {
            last: PageNames.MANAGE_CHANNEL,
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
        this.selectSourcePageName = null;
        this.shownModal = null;
      },
      // @public (used by taskNotificationMixin)
      onWatchedTaskFinished() {
        // For exports, there are no side effects once task has finished.
        if (this.watchedTaskType !== TaskTypes.DELETECONTENT) return;

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
              this.$router.replace({ name: PageNames.MANAGE_CONTENT_PAGE });
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

  .banner {
    margin-bottom: 24px;
  }

</style>
