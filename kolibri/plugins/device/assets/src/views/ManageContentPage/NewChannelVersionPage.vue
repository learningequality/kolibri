<template>

  <div>

    <section v-if="!loadingChannel">
      <h1>
        {{ $tr('versionIsAvailable', { channelName, nextVersion }) }}
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
      />
    </section>

    <section v-if="!loadingChannel" dir="auto">
      <template v-for="(info, idx) in versionInfos">
        <h2 :key="idx">
          {{ $tr('versionNumberHeader', { version: info.version }) }}
        </h2>
        <p :key="idx">
          {{ info.description }}
        </p>
      </template>
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
      @submit="handleSubmit"
      @cancel="showModal = false"
    >
      <p>{{ $tr('updateConfirmationQuestion', { version: nextVersion }) }}</p>
    </KModal>
  </div>

</template>


<script>

  import find from 'lodash/find';
  import pickBy from 'lodash/pickBy';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { TaskResource } from 'kolibri.resources';
  import CoreInfoIcon from 'kolibri.coreVue.components.CoreInfoIcon';
  import { taskIsClearable } from '../../constants';
  import { fetchOrTriggerChannelDiffStatsTask, fetchChannelAtSource } from './api';

  export default {
    name: 'NewChannelVersionPage',
    components: {
      CoreInfoIcon,
    },
    mixins: [commonCoreStrings],
    data() {
      return {
        channelName: 'Upgrade channel',
        nextVersion: 20,
        currentVersion: 19,
        deletedResources: null,
        newResources: null,
        updatedNodeIds: [],
        versionInfos: [],
        status: null,
        showModal: false,
        loadingTask: true,
        loadingChannel: true,
        watchedTaskId: null,
      };
    },
    computed: {
      channelIsIncomplete() {
        return false;
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
        this.channelName = installedChannel.name;
        this.$store.commit('coreBase/SET_APP_BAR_TITLE', this.channelName);
        this.currentVersion = installedChannel.version;
        this.nextVersion = sourceChannel.version;
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
        // Create the import channel task
        // Redirect to the MANAGE_CONTENT_PAGE
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
        this.updatedNodeIds = task.updated_node_ids;

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
