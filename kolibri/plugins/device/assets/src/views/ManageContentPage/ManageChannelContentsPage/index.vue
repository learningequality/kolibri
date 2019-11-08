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

    <SelectionBottomBar
      objectType="resource"
      actionType="manage"
      :resourceCounts="resourceCounts"
      :disabled="!Boolean(currentNode) || disableBottomBar"
      @selectoption="shownModal = $event"
    />

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
    mixins: [commonCoreStrings],
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
      };
    },
    computed: {
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
      channelId() {
        return this.$route.params.channel_id;
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
        return this.runTask(
          this.startDeleteTask({
            deleteEverywhere,
            channelId: this.channelId,
            included: this.selections.included,
            excluded: this.selections.excluded,
          })
        );
      },
      handleExportSubmit({ driveId }) {
        return this.runTask(
          this.startExportTask({
            driveId,
            channelId: this.channelId,
            included: this.selections.included,
            excluded: this.selections.excluded,
          })
        );
      },
      runTask(task) {
        this.closeModal();
        this.disableBottomBar = true;
        return task
          .then(() => {
            this.disableBottomBar = false;
            this.$store.dispatch('createTaskStartedSnackbar');
          })
          .catch(() => {
            this.disableBottomBar = false;
            this.$store.dispatch('createTaskFailedSnackbar');
          });
      },
      handleSelectImportMoreSource(params) {
        if (params.source === 'network') {
          this.$router.push({
            name: 'SELECT_CONTENT',
            params: {
              channel_id: this.channelId,
            },
            query: {
              last: 'MANAGE_CHANNEL',
            },
          });
        }
      },
      closeModal() {
        this.shownModal = null;
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
