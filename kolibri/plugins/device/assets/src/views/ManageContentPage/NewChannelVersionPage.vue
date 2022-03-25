<template>

  <div v-if="!loadingChannel">

    <section v-if="!isUpdatingChannel">
      <h1>
        {{ $tr('updateChannelAction') }}
      </h1>
      <TaskPanel
        v-if="currentTask"
        :task="currentTask"
        :nextStep="true"
        class="task-panel"
        :style="{ borderBottomColor: $themePalette.grey.v_200 }"
        @clickclear="handleClickContinue(currentTask)"
        @clickcancel="handleClickCancel(currentTask)"
      />
    </section>

    <div v-else>
      <section>
        <h1>
          {{ versionAvailableText }}
        </h1>
        <p> {{ $tr('youAreCurrentlyOnVersion', { currentVersion }) }}</p>
        <p v-if="channelIsIncomplete">
          {{ $tr('channelIsIncomplete', { available, total }) }}
        </p>
      </section>

      <section>
        <p>
          <strong>
            {{ $tr('versionChangesHeader', {
              oldVersion: currentVersion,
              newVersion: nextVersion
            }) }}
          </strong>
        </p>
        <table v-if="!loadingChannel && !loadingTask">
          <tr>
            <th>{{ $tr('resourcesAvailableForImport') }}</th>
            <td class="col-2">
              <span
                :class="{ 'count-added': newResources }"
                :style="{ color: $themeTokens.success }"
              >
                {{ newResources }}
              </span>
            </td>
          </tr>
          <tr>
            <th>{{ $tr('resourcesToBeDeleted') }}</th>
            <td>
              <span
                :class="{ 'count-deleted': deletedResources > 0 }"
                :style="{ color: $themeTokens.error }"
              >
                {{ deletedResources }}
              </span>
            </td>
            <td>
              <CoreInfoIcon
                v-if="deletedResources"
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
        <KLinearLoader
          v-else
          :indeterminate="true"
          :delay="false"
        />

      </section>

      <dl>
        <template v-for="(note, idx) in sortedFilteredVersionNotes">
          <dt :key="`dt-${idx}`">
            {{ $tr('versionNumberHeader', { version: note.version }) }}
          </dt>
          <dd :key="`dd-${idx}`" dir="auto">
            {{ note.notes }}
          </dd>
        </template>
      </dl>
    </div>
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

    <BottomAppBar>
      <KButton
        v-if="channelIsUpdated"
        :text="$tr('updateChannelAction')"
        appearance="raised-button"
        :primary="true"
        :disabled="loadingChannel || loadingTask"
        @click="showModal = true"
      />
      <KButton
        v-else
        :text="coreString('continueAction')"
        appearance="raised-button"
        :primary="true"
        :disabled="loadingChannel || !channelIsUpdated"
        @click="handleSubmit"
      />
    </BottomAppBar>
  </div>

</template>


<script>

  import find from 'lodash/find';
  import pickBy from 'lodash/pickBy';
  import sortBy from 'lodash/sortBy';
  import map from 'lodash/map';
  import reverse from 'lodash/fp/reverse';
  import { mapGetters } from 'vuex';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { TaskResource } from 'kolibri.resources';
  import BottomAppBar from 'kolibri.coreVue.components.BottomAppBar';
  import CoreInfoIcon from 'kolibri.coreVue.components.CoreInfoIcon';
  import { TaskStatuses, PageNames } from '../../constants';
  import TaskPanel from '../ManageTasksPage/TaskPanel';
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
      BottomAppBar,
      TaskPanel,
    },
    mixins: [commonCoreStrings],
    data() {
      return {
        channelName: '',
        nextVersion: null,
        currentVersion: null,
        deletedResources: null,
        newResources: null,
        updatedResources: null,
        versionNotes: {},
        showModal: false,
        disableModal: false,
        loadingTask: true,
        loadingChannel: true,
        watchedTaskId: null,
        isUpdatingChannel: false,
        channelIsUpdated: false,
      };
    },
    computed: {
      ...mapGetters('manageContent', ['managedTasks']),
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
      params() {
        return pickBy({
          channelId: this.$route.params.channel_id,
          driveId: this.$route.query.drive_id,
          addressId: this.$route.query.address_id,
        });
      },
      sortedFilteredVersionNotes() {
        // Show version notes for all versions since the current one
        const versionArray = map(this.versionNotes, (val, key) => {
          return {
            version: Number(key),
            notes: val,
          };
        }).filter(note => note.version > this.currentVersion);
        return sortBy(versionArray, note => -note.version);
      },
      watchedTaskHasFinished() {
        return this.$store.getters['manageContent/taskFinished'](this.watchedTaskId);
      },
      currentTask() {
        if (this.managedTasks && this.managedTasks.length > 1) {
          return reverse(this.managedTasks)[0];
        } else if (this.managedTasks && this.managedTasks.length == 1) {
          return this.managedTasks;
        } else {
          return null;
        }
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
        this.showModal = false;
        const updateParams = {
          sourcetype: 'remote',
          channel_id: this.params.channelId,
          new_version: this.nextVersion,
        };

        if (this.params.driveId) {
          updateParams.sourcetype = 'local';
          updateParams.drive_id = this.params.driveId;
        } else if (this.params.addressId) {
          updateParams.peer_id = this.params.addressId;
        }

        // Create the import channel task
        return TaskResource.postListEndpoint('startchannelupdate', updateParams)
          .then(taskResponse => {
            // If there are new resources in the new version, wait until the new
            // metadata DB is loaded, then redirect to the "Import More from Studio" flow.
            if (this.newResources) {
              this.isUpdatingChannel = true;
              this.loadingTask = true;
              this.showModal = false;
              const taskId = taskResponse.data.id;
              const taskList = state => state.manageContent.taskList;
              const stopWatching = this.$store.watch(taskList, tasks => {
                const match = tasks.find(task => task.id === taskId) || {};
                if (match.status === TaskStatuses.FAILED) {
                  stopWatching();
                  this.$router.push(this.$router.getRoute(PageNames.MANAGE_TASKS));
                } else if (match && match.database_ready) {
                  stopWatching();
                  this.channelIsUpdated = true;
                }
              });
            } else {
              this.$router.push({
                ...this.$router.getRoute(PageNames.SELECT_CONTENT),
              });
            }
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
        return fetchChannelAtSource(this.params).catch(error => {
          // Useful errors will still appear on AppError
          this.$store.dispatch('handleApiError', error);
        });
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
          if (task.clearable) {
            // If the task actually just failed, re-start the task
            if (task.status === TaskStatuses.FAILED) {
              this.startDiffStatsTask({
                baseurl: task.baseurl,
                driveId: task.drive_id,
              });
              TaskResource.deleteFinishedTask(task.id);
            } else {
              this.readAndDeleteTask(task);
            }
          } else {
            this.watchedTaskId = task.id;
          }
        });
      },
      readAndDeleteTask(task) {
        this.loadingTask = false;
        this.newResources = task.new_resources_count;
        this.deletedResources = task.deleted_resources_count;
        this.updatedResources = task.updated_resources_count;

        return TaskResource.deleteFinishedTask(task.id);
      },
      handleClickContinue(task) {
        TaskResource.deleteFinishedTask(task.id).catch(() => {
          // error silently
        });
        this.handleSubmit();
      },
      handleClickCancel(task) {
        TaskResource.cancelTask(task.id);
      },
      onWatchedTaskFinished() {
        const task = find(this.$store.state.manageContent.taskList, { id: this.watchedTaskId });
        this.readAndDeleteTask(task);
      },
    },
    $trs: {
      versionIsAvailable: {
        message: `Version {nextVersion} of '{channelName}' is available`,
        context:
          'When a new version of a channel is available, users can download it from this page.',
      },
      youAreCurrentlyOnVersion: {
        message: 'You are currently on version {currentVersion}',
        context: 'Indicates to the user which version of the channel they are currently using.',
      },
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
      updateChannelAction: {
        message: 'Update channel',
        context: "Title of the button on the 'Update channel' page.",
      },
      versionNumberHeader: {
        message: 'Version {version}',
        context: 'Indicates the version number of a new version of the specified channel.',
      },
      updateConfirmationQuestion: {
        message: `Are you sure you want to update '{channelName}' to version {version}?`,
        context:
          "Confirmation message that shows if user wants to complete the update channel action. For example:\n\n'Are you sure you want to update 'CREE' to version5?'",
      },
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

  .main-loader {
    margin-top: 8px;
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

  td,
  th {
    padding-top: 4px;
    padding-bottom: 4px;
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

  dt {
    font-weight: bold;
  }

  dd {
    margin-bottom: 8px;
  }

</style>
