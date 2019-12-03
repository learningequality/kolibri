<template>

  <div>

    <section v-if="!loadingChannel">
      <h1>
        {{ versionAvailableText }}
      </h1>
      <p> {{ $tr('youAreCurrentlyOnVersion', { currentVersion }) }}</p>
      <p v-if="channelIsIncomplete">
        {{ $tr('channelIsIncomplete', { available, total }) }}
      </p>
    </section>

    <div style="height: 32px" aria-hidden="true"></div>

    <section v-if="!loadingChannel && !loadingTask">
      <h3>
        {{ $tr('versionChangesHeader', {
          oldVersion: currentVersion,
          newVersion: nextVersion
        }) }}
      </h3>
      <table>
        <tr>
          <th>{{ $tr('resourcesAvailableForImport') }}</th>
          <td class="col-2">
            <span class="count-added" :style="{color: $themeTokens.success}">
              {{ newResources }}
            </span>
          </td>
        </tr>
        <tr>
          <th>{{ $tr('resourcesToBeDeleted') }}</th>
          <td>
            <span class="count-deleted" :style="{color: $themeTokens.error}">
              {{ deletedResources }}
            </span>
          </td>
          <td>
            <CoreInfoIcon
              class="info-icon"
              :tooltipText="$tr('resourcesToBeDeletedTooltip')"
              :iconAriaLabel="$tr('resourcesToBeDeletedTooltip')"
              tooltipPlacement="right"
            />
          </td>
        </tr>
        <tr>
          <th>{{ $tr('resourcesToBeUpdated') }}</th>
          <td>
            {{ updatedResources }}
          </td>
        </tr>
      </table>

      <div style="height: 24px" aria-hidden="true"></div>

      <KButton
        class="button"
        :text="$tr('updateChannelAction')"
        appearance="raised-button"
        :primary="true"
        @click="showModal = true"
      />
    </section>

    <div style="height: 48px" aria-hidden="true"></div>

    <section v-if="!loadingChannel">
      <div
        v-for="(note, idx) in sortedVersionNotes"
        v-show="note.version >= currentVersion"
        :key="idx"
      >
        <h2>
          {{ $tr('versionNumberHeader', { version: note.version }) }}
          <mat-svg
            v-if="note.version === nextVersion"
            class="exclamation-icon"
            name="priority_high"
            category="notification"
            :style="{fill: $themeTokens.primary}"
          />
        </h2>
        <p dir="auto">
          {{ note.notes }}
        </p>
      </div>
    </section>

    <!-- Load the channel immediately, then the diff stats -->
    <KLinearLoader
      v-if="loadingChannel || loadingTask"
      :indeterminate="true"
      :delay="false"
    />

    <KModal
      v-if="showModal"
      :title="$tr('updateChannelAction')"
      :submitText="coreString('continueAction')"
      :cancelText="coreString('cancelAction')"
      :disabled="disableModal"
      @submit="handleSubmit"
      @cancel="showModal = false"
    >
      <p>{{ $tr('updateConfirmationQuestion', { channelName, version: nextVersion }) }}</p>
    </KModal>
  </div>

</template>


<script>

  import find from 'lodash/find';
  import pickBy from 'lodash/pickBy';
  import sortBy from 'lodash/sortBy';
  import map from 'lodash/map';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { TaskResource } from 'kolibri.resources';
  import CoreInfoIcon from 'kolibri.coreVue.components.CoreInfoIcon';
  import { taskIsClearable } from '../../constants';
  import { fetchOrTriggerChannelDiffStatsTask, fetchChannelAtSource } from './api';

  export default {
    name: 'NewChannelVersionPage',
    metaInfo() {
      return {
        title: this.versionAvailableText,
      };
    },
    components: {
      CoreInfoIcon,
    },
    mixins: [commonCoreStrings],
    data() {
      return {
        channelName: '',
        nextVersion: null,
        currentVersion: null,
        deletedResources: null,
        newResources: null,
        updatedNodeIds: [],
        versionNotes: {},
        status: null,
        showModal: false,
        disableModal: false,
        loadingTask: true,
        loadingChannel: true,
        watchedTaskId: null,
      };
    },
    computed: {
      channelIsIncomplete() {
        return false;
      },
      versionAvailableText() {
        if (this.channelName) {
          return this.$tr('versionIsAvailable', {
            channelName: this.channelName,
            nextVersion: this.nextVersion,
          });
        }
        return '';
      },
      updatedResources() {
        return this.updatedNodeIds.length;
      },
      params() {
        return pickBy({
          channelId: this.$route.params.channel_id,
          driveId: this.$route.query.drive_id,
          addressId: this.$route.query.address_id,
        });
      },
      sortedVersionNotes() {
        const versionArray = map(this.versionNotes, (val, key) => {
          return {
            version: Number(key),
            notes: val,
          };
        });
        return sortBy(versionArray, note => -note.version);
      },
      watchedTaskHasFinished() {
        return this.$store.getters['manageContent/taskFinished'](this.watchedTaskId);
      },
    },
    watch: {
      watchedTaskHasFinished(val) {
        if (val && val === this.watchedTaskId) {
          this.onWatchedTaskFinished();
        }
      },
    },
    mounted() {
      this.$store.commit('coreBase/SET_APP_BAR_TITLE', this.coreString('loadingLabel'));
      this.loadChannelInfo().then(([installedChannel, sourceChannel]) => {
        // Show the channel info ASAP
        this.setChannelData(installedChannel, sourceChannel);

        this.loadingChannel = false;

        // Trigger Diff Stats task right after
        // HACK params for import task are appended to sourceChannel to avoid more REST calls
        this.startDiffStatsTask({
          baseurl: sourceChannel.baseurl,
          driveId: sourceChannel.driveId,
        });
      });
    },
    methods: {
      handleSubmit() {
        this.disableModal = true;
        const updateParams = {
          sourcetype: 'remote',
          channel_id: this.params.channelId,
          node_ids: this.updatedNodeIds,
          new_version: this.nextVersion,
        };

        if (this.params.driveId) {
          updateParams.sourcetype = 'local';
          updateParams.drive_id = this.params.driveId;
        } else if (this.params.addressId) {
          updateParams.address_id = this.params.addressId;
        }

        // Create the import channel task
        return TaskResource.postListEndpoint('startchannelupdate', updateParams)
          .then(() => {
            this.$router.push(this.$router.getRoute('MANAGE_TASKS'));
          })
          .catch(error => {
            this.$store.dispatch('handleApiError', error);
          });
      },
      setChannelData(installedChannel, sourceChannel) {
        this.$store.commit('coreBase/SET_APP_BAR_TITLE', installedChannel.name);
        this.channelName = installedChannel.name;
        this.currentVersion = installedChannel.version;
        this.nextVersion = sourceChannel.version;
        // Currently, version notes only available if upgrading from Studio via
        // RemoteChannelViewset
        this.versionNotes = sourceChannel.version_notes || {};
      },
      loadChannelInfo() {
        return fetchChannelAtSource(this.params).catch(errType => {
          this.status = errType;
        });
        // notAvailableFromDrives: 'This channel was not found on any attached drives',
        // notAvailableFromNetwork: 'This channel was not found on other instances of Kolibri',
        // notAvailableFromStudio: 'This channel was not found on Kolibri Studio',
      },
      startDiffStatsTask(sourceParams) {
        // Finds or triggers a new CHANNELDIFFSTATS task.
        // If one is already found, it will immediately clear it after loading the data.
        // If a new Task is triggered, the component will watch the Task until it is completed,
        // then clear it after the data is loaded.
        return fetchOrTriggerChannelDiffStatsTask({
          channelId: this.params.channelId,
          ...sourceParams,
        }).then(task => {
          if (taskIsClearable(task)) {
            this.readAndDeleteTask(task);
          } else {
            this.watchedTaskId = task.id;
          }
        });
      },
      readAndDeleteTask(task) {
        this.loadingTask = false;
        this.newResources = task.new_resources_count;
        this.deletedResources = task.deleted_resources_count;
        this.updatedNodeIds = task.updated_node_ids || [];

        return TaskResource.deleteFinishedTask(task.id);
      },
      onWatchedTaskFinished() {
        const task = find(this.$store.state.manageContent.taskList, { id: this.watchedTaskId });
        this.readAndDeleteTask(task);
      },
    },
    $trs: {
      versionIsAvailable: `Version {nextVersion} of '{channelName}' is available`,
      youAreCurrentlyOnVersion: 'You are currently on version {currentVersion}',
      versionChangesHeader: {
        message: 'Changes if you choose to update from version {oldVersion} to {newVersion}:',
        context:
          'Header above a table that lists what the consequences of updating the channel would be',
      },
      resourcesAvailableForImport: {
        message: 'New resources available',
        context:
          'Label associated with the number of resources that would become available for importing if the channel is updated',
      },
      resourcesToBeDeleted: {
        message: 'Resources that will be deleted',
        context:
          'Label associated with the number of resources that would be deleted if the channel is updated',
      },
      resourcesToBeDeletedTooltip: {
        message:
          'When you update this channel, some resources will be deleted. This may affect lessons or quizzes that are using the deleted resources',
        context: 'Warning about the effects of updating the channel',
      },
      resourcesToBeUpdated: {
        message: 'Resources to be updated',
        context: 'Label associated with the number of resources would be updated',
      },
      updateChannelAction: 'Update channel',
      versionNumberHeader: 'Version {version}',
      updateConfirmationQuestion: `Are you sure you want to update '{channelName}' to version {version}?`,
      channelIsIncomplete: {
        message:
          "This copy of '{channel}' is incomplete. It contains {resourcesInChannel} of {totalResources} resources from the original channel",
        context:
          'Warning indicating that the source does not have all content from the original channel',
      },
    },
  };

</script>


<style lang="scss" scoped>

  h1 {
    font-size: 24px;
  }

  h2 {
    font-size: 20px;
  }

  .button {
    margin-left: 0;
  }

  /deep/ .k-tooltip {
    max-width: 300px;
    text-align: left;
  }

  .count-added::before {
    content: '+';
  }

  .count-deleted::before {
    content: '-';
  }

  .info-icon {
    margin-top: 2px;
    margin-left: 16px;
  }

  .exclamation-icon {
    vertical-align: -3px;
  }

  tr {
    height: 2em;
  }

  th {
    font-weight: normal;
    text-align: left;
  }

  td {
    text-align: right;
  }

  td.col-2 {
    min-width: 120px;
  }

</style>
