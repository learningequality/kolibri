<template>

  <ImmersivePage
    :appBarTitle="toolbarTitle"
    :route="backRoute"
  >
    <KPageContainer class="device-container">
      <ContentWizardUiAlert
        v-if="status"
        :errorType="status"
      />

      <FilteredChannelListContainer
        v-if="status === '' && !$store.state.core.loading"
        :channels="allChannels"
        :selectedChannels.sync="selectedChannels"
        :selectAllCheckbox="multipleMode"
      >
        <template #header>
          <h1
            v-if="status === ''"
            data-test="title"
          >
            {{ multipleMode ? $tr('importChannelsHeader') : $tr('importResourcesHeader') }}
          </h1>
        </template>

        <template #abovechannels>
          <p>
            <KButton
              v-if="channelsAreAvailable"
              appearance="basic-link"
              :text="multipleMode ? $tr('selectTopicsAndResources') : $tr('selectEntireChannels')"
              @click="toggleMultipleMode"
            />
          </p>
          <KButton
            v-if="showUnlistedChannels"
            data-test="token-button"
            :text="$tr('channelTokenButtonLabel')"
            appearance="raised-button"
            name="showtokenmodal"
            @click="showTokenModal = true"
          />
          <div
            v-if="$route.query.token"
            class="token-chip"
            :style="{ backgroundColor: $themePalette.grey.v_400 }"
          >
            <span>
              <p class="token-chip-text">{{ $route.query.token }}</p>
              <KIconButton
                icon="delete"
                size="mini"
                class="token-chip-button"
                @click="clearToken"
              />
            </span>
          </div>
          <p>
            <UiAlert
              v-show="notEnoughFreeSpace"
              :dismissible="false"
              type="error"
            >
              {{ deviceString('notEnoughSpaceForChannelsWarning') }}
            </UiAlert>
          </p>
        </template>

        <template #default="{ showItem, handleChange, itemIsSelected }">
          <p v-if="!channelsAreAvailable && !status">
            {{ $tr('noChannelsAvailable') }}
          </p>

          <p v-else>
            <ChannelPanel
              v-for="channel in allChannels"
              v-show="showItem(channel) && !channelIsBeingDeleted(channel.id)"
              :key="channel.id"
              :channel="channel"
              :onDevice="channelIsOnDevice(channel)"
              :multipleMode="multipleMode"
              :checked="itemIsSelected(channel)"
              @clickselect="goToSelectContentPageForChannel(channel)"
              @checkboxchange="handleChange"
            />
          </p>
        </template>
      </FilteredChannelListContainer>

      <KCircularLoader
        v-else
        style="margin: 2em auto"
      />

      <ChannelTokenModal
        v-if="showTokenModal"
        :disabled="disableModal"
        @cancel="showTokenModal = false"
        @submit="handleSubmitToken"
      />

      <ChannelUpdateModal
        v-if="showUpdateModal"
        :disabled="disableModal"
        @cancel="showUpdateModal = false"
        @submit="handleConfirmUpgrade"
      />

      <KLinearLoader
        v-if="channelsAreLoading"
        type="indeterminate"
        :delay="false"
      />

      <SelectionBottomBar
        v-if="multipleMode"
        objectType="channel"
        actionType="import"
        :disabled="disableBottomBar || selectedChannels.length === 0 || notEnoughFreeSpace"
        :selectedObjects="selectedChannels"
        :fileSize.sync="fileSize"
        @clickconfirm="handleClickConfirm"
      />
    </KPageContainer>
  </ImmersivePage>

</template>


<script>

  import { mapState, mapGetters } from 'vuex';
  import find from 'lodash/find';
  import differenceBy from 'lodash/differenceBy';
  import omit from 'lodash/omit';
  import some from 'lodash/some';
  import uniqBy from 'lodash/uniqBy';
  import ImmersivePage from 'kolibri.coreVue.components.ImmersivePage';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { TaskResource } from 'kolibri.resources';
  import UiAlert from 'kolibri-design-system/lib/keen/UiAlert';
  import { TransferTypes, TaskTypes } from 'kolibri.utils.syncTaskUtils';
  import plugin_data from 'plugin_data';
  import commonDeviceStrings from '../commonDeviceStrings';
  import ChannelPanel from '../ManageContentPage/ChannelPanel/WithImportDetails';
  import ContentWizardUiAlert from '../SelectContentPage/ContentWizardUiAlert';
  import { selectContentPageLink } from '../ManageContentPage/manageContentLinks';
  import useContentTasks from '../../composables/useContentTasks';
  import { PageNames } from '../../constants';
  import FilteredChannelListContainer from '../ManageContentPage/FilteredChannelListContainer';
  import SelectionBottomBar from '../ManageContentPage/SelectionBottomBar';
  import taskNotificationMixin from '../taskNotificationMixin';
  import ChannelTokenModal from './ChannelTokenModal';
  import ChannelUpdateModal from './ChannelUpdateModal';
  import { getFreeSpaceOnServer } from './api';

  export default {
    name: 'AvailableChannelsPage',
    metaInfo() {
      return {
        title: this.documentTitle,
      };
    },
    components: {
      ChannelPanel,
      ChannelTokenModal,
      ChannelUpdateModal,
      ContentWizardUiAlert,
      FilteredChannelListContainer,
      ImmersivePage,
      SelectionBottomBar,
      UiAlert,
    },
    mixins: [commonCoreStrings, commonDeviceStrings, taskNotificationMixin],
    setup() {
      useContentTasks();
    },
    data() {
      return {
        showTokenModal: false,
        showUpdateModal: false,
        newUnlistedChannels: [],
        selectedChannels: [],
        fileSize: 0,
        freeSpace: null,
        disableBottomBar: false,
        disableModal: false,
        remoteContentEnabled: plugin_data.isRemoteContent,
      };
    },
    computed: {
      ...mapGetters('manageContent', ['installedChannelsWithResources', 'channelIsBeingDeleted']),
      ...mapGetters('manageContent/wizard', [
        'inLocalImportMode',
        'inRemoteImportMode',
        'inPeerImportMode',
        'isStudioApplication',
      ]),
      ...mapState('manageContent/wizard', [
        'availableChannels',
        'selectedDrive',
        'selectedPeer',
        'status',
        'transferType',
      ]),
      allChannels() {
        // We concatenate these arrays to keep to keep the same ordering from the
        // ManageContentPage, where installed channels are pushed to the front,
        // with their custom ordering.
        const installedChannels = this.installedChannelsWithResources
          .map(channel => {
            // Merge in version data to show the new-version notification
            const match = find(this.availableChannels, { id: channel.id });
            if (match) {
              return {
                ...channel,
                installed_version: channel.version,
                // match.latest_version is defined for unlisted channels.
                // For public channels, match.version is the version reported by Studio.
                // See getAllRemoteChannels action for details.
                latest_version: match.latest_version || match.version,
              };
            }
          })
          .filter(Boolean);
        const notInstalledChannels = differenceBy(
          this.availableChannels,
          this.installedChannelsWithResources,
          'id',
        );
        // Need to de-duplicate channels in case user enters same token twice, etc.
        return uniqBy(
          [...this.newUnlistedChannels, ...installedChannels, ...notInstalledChannels],
          'id',
        );
      },
      backRoute() {
        return { name: PageNames.MANAGE_CONTENT_PAGE };
      },
      multipleMode() {
        const { multiple } = this.$route.query;
        return this.setupMode || multiple === true || multiple === 'true';
      },
      setupMode() {
        return Boolean(this.$route.query.setup);
      },
      documentTitle() {
        switch (this.transferType) {
          case TransferTypes.LOCALIMPORT:
            return this.$tr('documentTitleForLocalImport', {
              driveName: this.selectedDrive.name,
            });
          case TransferTypes.REMOTEIMPORT:
            return this.$tr('documentTitleForRemoteImport');
          case TransferTypes.PEERIMPORT:
            return this.$tr('documentTitleForLocalImport', {
              driveName: this.selectedPeer.device_name,
            });
          default:
            return '';
        }
      },
      toolbarTitle() {
        switch (this.transferType) {
          case TransferTypes.LOCALIMPORT:
            return this.$tr('importFromDisk', { driveName: this.selectedDrive.name });
          case TransferTypes.PEERIMPORT:
            return this.$tr('importFromPeer', {
              deviceName: this.selectedPeer.device_name || this.selectedPeer.nickname,
              address: this.selectedPeer.base_url,
            });
          default:
            return this.$tr('importFromKolibriStudio');
        }
      },
      channelsAreLoading() {
        return this.status === 'LOADING_CHANNELS_FROM_KOLIBRI_STUDIO';
      },
      channelsAreAvailable() {
        return !this.channelsAreLoading && this.availableChannels.length > 0;
      },
      showUnlistedChannels() {
        return this.channelsAreAvailable && (this.inRemoteImportMode || this.isStudioApplication);
      },
      notEnoughFreeSpace() {
        // if the REMOTE_CONTENT option is true, we should not be submitting disk space issues
        if (this.remoteContentEnabled) {
          return false;
        }
        if (this.freeSpace === null) {
          return false;
        }
        if (this.freeSpace === 0) {
          return true;
        }
        return this.freeSpace < this.fileSize;
      },
    },
    created() {
      this.setFreeSpace();
    },
    mounted() {
      // If arriving here from the PostSetupModalGroup/WelcomeModal,
      // then select all the channels automatically
      if (this.setupMode) {
        this.selectedChannels = [...this.allChannels];
      }
    },
    methods: {
      channelIsOnDevice(channel) {
        const match = this.installedChannelsWithResources.find(({ id }) => id === channel.id);
        return Boolean(match);
      },
      toggleMultipleMode() {
        let newQuery;
        if (this.multipleMode) {
          // Remove the 'setup' query param if switching to single-channel mode.
          // When the user returns, none of the channels will be selected
          newQuery = omit(this.$route.query, ['multiple', 'setup']);
        } else {
          newQuery = {
            ...this.$route.query,
            multiple: true,
          };
        }
        return this.$router.push({ query: newQuery });
      },
      handleSubmitToken({ token, channels }) {
        this.showTokenModal = false;
        if (channels.length > 1) {
          if (this.$route.query.token !== token) {
            this.$router.push({
              ...this.$route,
              query: {
                ...this.$route.query,
                token,
              },
            });
          }
        } else {
          this.goToSelectContentPageForChannel(channels[0]);
        }
      },
      clearToken() {
        if (this.$route.query.token) {
          const query = {
            ...this.$route.query,
          };
          delete query.token;
          this.$router.push({
            ...this.$route,
            query,
          });
        }
      },
      goToSelectContentPageForChannel(channel) {
        this.$router.push(
          selectContentPageLink({
            addressId: this.$route.query.address_id,
            channelId: channel.id,
            driveId: this.$route.query.drive_id,
          }),
        );
      },
      handleClickConfirm() {
        this.disableBottomBar = true;
        const someChannelsWillUpdate = some(
          this.selectedChannels,
          c => c.installed_version < c.latest_version,
        );
        this.setFreeSpace().then(() => {
          if (this.notEnoughFreeSpace) {
            this.createTaskFailedSnackbar();
            this.disableBottomBar = false;
          } else {
            if (someChannelsWillUpdate) {
              this.showUpdateModal = true;
            } else {
              this.startMultipleChannelImport();
            }
          }
        });
      },
      setFreeSpace() {
        return getFreeSpaceOnServer().then(({ freeSpace }) => {
          this.freeSpace = freeSpace;
        });
      },
      handleConfirmUpgrade() {
        this.startMultipleChannelImport();
      },
      goToManageTasksPage() {
        this.$router.push({ name: PageNames.MANAGE_TASKS });
      },
      startMultipleChannelImport() {
        const baseParams = {
          type: this.inLocalImportMode ? TaskTypes.DISKIMPORT : TaskTypes.REMOTEIMPORT,
        };
        if (this.inLocalImportMode) {
          baseParams.drive_id = this.selectedDrive.id;
        } else if (this.inPeerImportMode) {
          baseParams.peer = this.selectedPeer.id;
        }
        const taskParams = this.selectedChannels.map(x => ({
          ...baseParams,
          channel_name: x.name,
          channel_id: x.id,
        }));
        return TaskResource.startTasks(taskParams)
          .then(tasks => {
            this.notifyAndWatchTask(tasks);
            this.goToManageTasksPage();
          })
          .catch(() => {
            this.createTaskFailedSnackbar();
            this.disableBottomBar = false;
          });
      },
    },
    $trs: {
      importChannelsHeader: {
        message: 'Select channels for import',
        context:
          'Title of the page where a user can select entire channels of resources to import.',
      },
      importResourcesHeader: {
        message: 'Select resources for import',
        context:
          'Title of the page where a user can select topics and resources to import, rather than entire channels.\n',
      },
      importFromDisk: {
        message: `Import from '{driveName}'`,
        context: 'Title page user sees when they opt to import resources from a local disk drive.',
      },
      importFromPeer: {
        message: `Import from '{deviceName}' ({address})`,
        context:
          'Page user sees when they opt to import resources from another device in the same local network through peer import.',
      },
      importFromKolibriStudio: {
        message: 'Import from Kolibri Studio',
        context: 'Option to import resources from Kolibri Studio.',
      },
      channelTokenButtonLabel: {
        message: 'Import with token',
        context:
          "If a user needs to import learning resources from a private/unlisted channel, they would click on the 'Import with token' button above the channel list.",
      },
      documentTitleForLocalImport: {
        message: "Available Channels on '{driveName}'",
        context: 'Indicates the available resource channels on a device.',
      },
      documentTitleForRemoteImport: {
        message: 'Available Channels on Kolibri Studio',
        context: 'Indicates the available resource channels on Kolibri Studio.',
      },
      noChannelsAvailable: {
        message: 'No channels are available on this device',
        context: 'Message shows if there are no channels available on the device.',
      },
      selectEntireChannels: {
        message: 'Select entire channels instead',
        context:
          'Allow the user to select entire channels instead of individual topics/resources within a channel.',
      },
      selectTopicsAndResources: {
        message: 'Select folders and resources instead',
        context:
          'Option to allow the user to select individual folders/resources within a channel instead of importing entire channels.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '../../styles/definitions';

  .device-container {
    @include device-kpagecontainer;
  }

  .channel-list-header {
    padding: 16px 0;
    font-size: 14px;
  }

  .token-chip {
    display: inline-block;
    margin-left: 8px;
    font-size: 14px;
    vertical-align: middle;
    border-radius: 34px;
  }

  .token-chip-text {
    display: inline-block;
    margin: 4px 0 4px 8px;
    font-size: 14px;
  }

  .token-chip-button {
    min-width: 24px !important;
    margin: 2px;
    vertical-align: middle;
  }

</style>
