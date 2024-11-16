<template>

  <ImmersivePage
    icon="back"
    :appBarTitle="channelName"
    :route="backRoute"
  >
    <KPageContainer class="device-container">
      <div v-if="!loadingChannel">
        <section>
          <h1>
            {{ versionAvailableText }}
          </h1>
          <p>{{ $tr('youAreCurrentlyOnVersion', { currentVersion }) }}</p>
          <p v-if="channelIsIncomplete">
            {{ $tr('channelIsIncomplete', { available, total }) }}
          </p>
        </section>

        <section>
          <p>
            <strong>
              {{
                $tr('versionChangesHeader', {
                  oldVersion: currentVersion,
                  newVersion: nextVersion,
                })
              }}
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
            <dd
              :key="`dd-${idx}`"
              dir="auto"
            >
              {{ note.notes }}
            </dd>
          </template>
        </dl>

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
            :text="$tr('updateChannelAction')"
            appearance="raised-button"
            :primary="true"
            :disabled="loadingChannel || loadingTask"
            @click="showModal = true"
          />
        </BottomAppBar>
      </div>
    </KPageContainer>
  </ImmersivePage>

</template>


<script>

  import find from 'lodash/find';
  import pickBy from 'lodash/pickBy';
  import sortBy from 'lodash/sortBy';
  import map from 'lodash/map';
  import get from 'lodash/get';
  import { mapState } from 'vuex';
  import ImmersivePage from 'kolibri/components/pages/ImmersivePage';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import TaskResource from 'kolibri/apiResources/TaskResource';
  import BottomAppBar from 'kolibri/components/BottomAppBar';
  import CoreInfoIcon from 'kolibri-common/components/labels/CoreInfoIcon';
  import { TaskStatuses, TaskTypes } from 'kolibri-common/utils/syncTaskUtils';
  import { PageNames } from '../../constants';
  import useContentTasks from '../../composables/useContentTasks';
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
      ImmersivePage,
    },
    mixins: [commonCoreStrings],
    setup() {
      useContentTasks();
    },
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
      };
    },
    computed: {
      ...mapState('manageContent', ['tasks']),
      backRoute() {
        return { name: get(this, '$route.query.last', PageNames.MANAGE_CONTENT_PAGE) };
      },
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
          channel_id: this.$route.params.channel_id,
          drive_id: this.$route.query.drive_id,
          peer: this.$route.query.address_id,
          channel_name: this.channelName,
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
    },
    watch: {
      watchedTaskHasFinished(val) {
        if (val && val === this.watchedTaskId) {
          this.onWatchedTaskFinished();
        }
      },
    },
    mounted() {
      this.loadChannelInfo().then(([installedChannel, sourceChannel]) => {
        // Show the channel info ASAP
        this.setChannelData(installedChannel, sourceChannel);

        this.loadingChannel = false;
        this.startDiffStatsTask();
      });
    },
    methods: {
      handleSubmit() {
        this.disableModal = true;

        // Create the import channel task
        return TaskResource.startTask({
          type: this.params.drive_id ? TaskTypes.DISKIMPORT : TaskTypes.REMOTEIMPORT,
          update: true,
          ...this.params,
        })
          .then(task => {
            // If there are new resources in the new version, wait until the new
            // metadata DB is loaded, then redirect to the "Import More from Studio" flow.
            if (this.newResources) {
              this.loadingTask = true;
              const taskId = task.id;
              const taskList = state => state.manageContent.taskList;
              const stopWatching = this.$store.watch(taskList, tasks => {
                const match = tasks.find(task => task.id === taskId) || {};
                if (match && match.extra_metadata.database_ready) {
                  stopWatching();
                  this.$router.push({
                    ...this.$router.getRoute(PageNames.SELECT_CONTENT),
                    query: {
                      last: PageNames.MANAGE_CONTENT_PAGE,
                    },
                  });
                } else if (match.status === TaskStatuses.FAILED) {
                  stopWatching();
                  this.$router.push(this.$router.getRoute(PageNames.MANAGE_TASKS));
                }
              });
            } else {
              this.$router.push({
                name: PageNames.MANAGE_TASKS,
                query: {
                  last: PageNames.MANAGE_CHANNEL,
                  channel_id: this.params.channel_id,
                },
              });
            }
          })
          .catch(error => {
            this.$store.dispatch('handleApiError', { error });
          });
      },
      setChannelData(installedChannel, sourceChannel) {
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
          this.$store.dispatch('handleApiError', { error });
        });
      },
      startDiffStatsTask() {
        // Finds or triggers a new job to calculate the diff stats for this channel.
        // If one is already found, it will immediately clear it after loading the data.
        // If a new Task is triggered, the component will watch the Task until it is completed,
        // then clear it after the data is loaded.
        return fetchOrTriggerChannelDiffStatsTask({ ...this.params }, this.tasks).then(task => {
          if (task.clearable) {
            // If the task actually just failed, re-start the task
            if (task.status === TaskStatuses.FAILED) {
              this.startDiffStatsTask();
              TaskResource.clear(task.id);
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
        this.newResources = task.extra_metadata.new_resources_count;
        this.deletedResources = task.extra_metadata.deleted_resources_count;
        this.updatedResources = task.extra_metadata.updated_resources_count;

        return TaskResource.clear(task.id);
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
      /* eslint-disable kolibri/vue-no-unused-translations */
      resourceOrFolderMetadata: {
        message: 'Resource and folder information has changed',
        context: 'Indicates that the metadata for a resource or folder has changed',
      },
      /* eslint-enable kolibri/vue-no-unused-translations */
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

  @import '../../styles/definitions';

  .device-container {
    @include device-kpagecontainer;
  }

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
