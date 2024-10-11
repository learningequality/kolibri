<template>

  <DeviceAppBarPage :title="pageTitle">
    <KPageContainer class="device-container">
      <HeaderWithOptions :headerText="coreString('facilitiesLabel')">
        <template #options>
          <!-- Margins to and bottom adds space when buttons are vertically stacked -->
          <KButtonGroup>
            <KButton
              v-if="isAnyFacilityRegistered"
              :text="$tr('syncAllAction')"
              style="margin-top: 16px; margin-bottom: -16px"
              @click="showSyncAllModal = true"
            />
            <KButton
              hasDropdown
              :text="$tr('createFacilityLabel')"
              primary
              style="margin-top: 16px; margin-bottom: -16px"
            >
              <template #menu>
                <KDropdownMenu
                  :options="options"
                  @select="handleSelect"
                />
              </template>
            </KButton>
          </KButtonGroup>
        </template>
      </HeaderWithOptions>

      <TasksBar
        v-if="activeFacilityTasks.length > 0"
        :tasks="activeFacilityTasks"
        :taskManagerLink="{ name: 'FACILITIES_TASKS_PAGE' }"
        @clearall="handleClickClearAll"
      />

      <CoreTable :dataLoading="loadingFacilities">
        <template #headers>
          <th>{{ coreString('facilityLabel') }}</th>
        </template>
        <template #tbody>
          <!-- On mobile, put buttons on a row of their own -->
          <tbody v-if="windowIsSmall">
            <template v-for="(facility, idx) in facilities">
              <tr
                :key="idx"
                style="border: 0 !important"
              >
                <td>
                  <FacilityNameAndSyncStatus
                    :facility="facility"
                    :isSyncing="facilityIsSyncing(facility)"
                    :isDeleting="facilityIsDeleting(facility)"
                    :syncHasFailed="facility.syncHasFailed"
                    :goToRoute="manageSync(facility.id)"
                  />
                </td>
              </tr>
              <tr :key="idx + facilities.length">
                <td style="padding: 0 0 16px">
                  <!-- Gives most space possible to buttons and aligns them with text -->
                  <KButtonGroup style="max-width: 100%; margin-right: -16px; margin-left: -16px">
                    <KButton
                      :text="coreString('syncAction')"
                      :disabled="facilityIsSyncing(facility)"
                      appearance="flat-button"
                      @click="facilityForSync = facility"
                    />
                    <KButton
                      hasDropdown
                      appearance="flat-button"
                      :text="coreString('optionsLabel')"
                      :disabled="facilityIsSyncing(facility)"
                    >
                      <template #menu>
                        <KDropdownMenu
                          :options="facilityOptions(facility)"
                          @select="handleOptionSelect($event.value, facility)"
                        />
                      </template>
                    </KButton>
                  </KButtonGroup>
                </td>
              </tr>
            </template>
          </tbody>

          <!-- Non-mobile -->
          <tbody v-else>
            <tr
              v-for="(facility, idx) in facilities"
              :key="idx"
            >
              <td>
                <FacilityNameAndSyncStatus
                  :facility="facility"
                  :isSyncing="facilityIsSyncing(facility)"
                  :isDeleting="facilityIsDeleting(facility)"
                  :syncHasFailed="facility.syncHasFailed"
                  :goToRoute="manageSync(facility.id)"
                />
              </td>
              <td class="button-col">
                <KButtonGroup>
                  <KButton
                    :text="coreString('syncAction')"
                    :disabled="facilityIsSyncing(facility)"
                    appearance="flat-button"
                    @click="facilityForSync = facility"
                  />
                  <KButton
                    hasDropdown
                    appearance="flat-button"
                    :text="coreString('optionsLabel')"
                    :disabled="facilityIsSyncing(facility)"
                  >
                    <template #menu>
                      <KDropdownMenu
                        :options="facilityOptions()"
                        @select="handleOptionSelect($event.value, facility)"
                      />
                    </template>
                  </KButton>
                </KButtonGroup>
              </td>
            </tr>
          </tbody>
        </template>
      </CoreTable>

      <RemoveFacilityModal
        v-if="Boolean(facilityForRemoval)"
        :facility="facilityForRemoval"
        @success="handleRemoveSuccess"
        @cancel="facilityForRemoval = null"
      />

      <SyncAllFacilitiesModal
        v-if="showSyncAllModal"
        :facilities="facilities"
        @success="handleSyncAllSuccess"
        @cancel="showSyncAllModal = false"
      />

      <ImportFacilityModalGroup
        v-if="showImportModal"
        @success="handleStartImportSuccess"
        @cancel="showImportModal = false"
      />
      <CreateNewFacilityModal
        v-if="showCreateFacilityModal"
        @success="handleCreateFacilitySuccess"
        @cancel="showCreateFacilityModal = false"
      />

      <!-- NOTE similar code for KDP Registration in SyncInterface -->
      <template v-if="Boolean(facilityForRegister)">
        <RegisterFacilityModal
          v-if="!kdpProject"
          :facility="facilityForRegister"
          :displaySkipOption="false"
          @success="handleValidateSuccess"
          @cancel="clearRegistrationState"
          @skip="handleKDPSync"
        />

        <ConfirmationRegisterModal
          v-else
          :targetFacility="facilityForRegister"
          :projectName="kdpProject.name"
          :token="kdpProject.token"
          @success="handleConfirmationSuccess"
          @cancel="clearRegistrationState"
        />
      </template>

      <SyncFacilityModalGroup
        v-if="Boolean(facilityForSync)"
        :facilityForSync="facilityForSync"
        @close="facilityForSync = null"
        @syncKDP="handleKDPSync"
        @syncPeer="handlePeerSync"
      />
    </KPageContainer>
  </DeviceAppBarPage>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import commonSyncElements from 'kolibri-common/mixins/commonSyncElements';
  import CoreTable from 'kolibri/components/CoreTable';
  import FacilityResource from 'kolibri-common/apiResources/FacilityResource';
  import FacilityNameAndSyncStatus from 'kolibri-common/components/syncComponentSet/FacilityNameAndSyncStatus';
  import RegisterFacilityModal from 'kolibri-common/components/syncComponentSet/RegisterFacilityModal';
  import ConfirmationRegisterModal from 'kolibri-common/components/syncComponentSet/ConfirmationRegisterModal';
  import SyncFacilityModalGroup from 'kolibri-common/components/syncComponentSet/SyncFacilityModalGroup';
  import { TaskStatuses, TaskTypes } from 'kolibri-common/utils/syncTaskUtils';
  import some from 'lodash/some';
  import useSnackbar from 'kolibri/composables/useSnackbar';
  import DeviceAppBarPage from '../DeviceAppBarPage';
  import { PageNames, ImportFacility, CreateNewFacility } from '../../constants';
  import { deviceString } from '../commonDeviceStrings';
  import TasksBar from '../ManageContentPage/TasksBar';
  import HeaderWithOptions from '../HeaderWithOptions';
  import RemoveFacilityModal from './RemoveFacilityModal';
  import SyncAllFacilitiesModal from './SyncAllFacilitiesModal';
  import ImportFacilityModalGroup from './ImportFacilityModalGroup';
  import CreateNewFacilityModal from './CreateNewFacilityModal';
  import facilityTaskQueue from './facilityTasksQueue';

  const Options = Object.freeze({
    REGISTER: 'REGISTER',
    REMOVE: 'REMOVE',
    MANAGESYNC: 'MANAGE SYNC',
  });

  export default {
    name: 'FacilitiesPage',
    metaInfo() {
      return {
        title: this.coreString('facilitiesLabel'),
      };
    },
    components: {
      DeviceAppBarPage,
      ConfirmationRegisterModal,
      CoreTable,
      CreateNewFacilityModal,
      HeaderWithOptions,
      FacilityNameAndSyncStatus,
      ImportFacilityModalGroup,
      RegisterFacilityModal,
      RemoveFacilityModal,
      SyncFacilityModalGroup,
      SyncAllFacilitiesModal,
      TasksBar,
    },
    mixins: [commonCoreStrings, commonSyncElements, facilityTaskQueue],
    setup() {
      const { windowIsSmall } = useKResponsiveWindow();
      const { createSnackbar } = useSnackbar();
      return {
        windowIsSmall,
        createSnackbar,
      };
    },
    data() {
      return {
        showSyncAllModal: false,
        showImportModal: false,
        showCreateFacilityModal: false,
        facilities: [],
        facilityForSync: null,
        facilityForRemoval: null,
        facilityForRegister: null,
        kdpProject: null, // { name, token }
        taskIdsToWatch: [],
        loadingFacilities: true, // We're fetching in beforeMount so should make it true
      };
    },
    computed: {
      options() {
        return [
          {
            label: this.$tr('importFacilityLabel'),
            value: ImportFacility,
          },
          {
            label: this.$tr('createNewFacilityLabel'),
            value: CreateNewFacility,
          },
        ];
      },
      pageTitle() {
        return deviceString('deviceManagementTitle');
      },
      isAnyFacilityRegistered() {
        return some(this.facilities, facility => facility.dataset.registered);
      },
    },
    watch: {
      // Update facilities whenever a watched task completes
      facilityTasks(newTasks, prevTasks) {
        for (const index in newTasks) {
          const task = newTasks[index];
          if (this.taskIdsToWatch.includes(task.id)) {
            if (
              task.status === TaskStatuses.COMPLETED ||
              this.isRepeatingTaskCompleted(task, prevTasks)
            ) {
              this.fetchFacilites();
              if (task.type === TaskTypes.DELETEFACILITY) {
                this.showFacilityRemovedSnackbar(task.facility_name);
              }
              this.taskIdsToWatch = this.taskIdsToWatch.filter(x => x !== task.id);
            } else if (this.isSyncTask(task) && task.status === TaskStatuses.FAILED) {
              const match = this.facilities.find(({ id }) => id === task.facility);
              if (match) {
                this.$set(match, 'syncHasFailed', true);
              }
            }
          } else {
            // Add tasks that aren't being watched yet
            if (!task.clearable) {
              this.taskIdsToWatch.push(task.id);
            }
          }
        }
      },
    },
    beforeMount() {
      this.fetchFacilites()
        .then(() => (this.loadingFacilities = false))
        .catch(() => (this.loadingFacilities = false));
    },
    methods: {
      isRepeatingTaskCompleted(task, prevTasks) {
        if (!task.repeat_interval) {
          return false;
        }
        const prevTask = prevTasks.find(({ id }) => id === task.id);
        if (!prevTask) {
          return false;
        }
        return prevTask.status === TaskStatuses.RUNNING && task.status === TaskStatuses.QUEUED;
      },
      facilityOptions() {
        return [
          {
            label: this.coreString('manageSyncAction'),
            value: Options.MANAGESYNC,
          },
          {
            label: this.coreString('registerAction'),
            value: Options.REGISTER,
          },
          {
            label: this.coreString('removeAction'),
            value: Options.REMOVE,
          },
        ];
      },
      handleOptionSelect(option, facility) {
        if (option === Options.REMOVE) {
          this.facilityForRemoval = facility;
        } else if (option === Options.REGISTER) {
          this.facilityForRegister = facility;
        } else if (option === Options.MANAGESYNC) {
          const route = this.manageSync(facility.id);
          this.$router.push(route);
        }
      },
      fetchFacilites() {
        return FacilityResource.fetchCollection({ force: true }).then(facilities => {
          this.facilities = [...facilities];
        });
      },
      handleClickClearAll() {
        Promise.all([this.fetchFacilites(), this.clearCompletedFacilityTasks()]);
      },
      handleValidateSuccess({ name, token }) {
        this.kdpProject = { name, token };
      },
      handleConfirmationSuccess() {
        this.fetchFacilites();
        this.clearRegistrationState();
      },
      clearRegistrationState() {
        this.facilityForRegister = null;
        this.kdpProject = null;
      },
      handleStartSyncSuccess(task) {
        this.taskIdsToWatch.push(task.id);
        this.facilityTasks.push(task);
        this.facilityForSync = null;
      },
      handleSyncAllSuccess() {
        this.showSyncAllModal = false;
      },
      handleStartImportSuccess() {
        this.$router.push({
          name: 'FACILITIES_TASKS_PAGE',
        });
        this.showImportModal = false;
      },
      handleCreateFacilitySuccess() {
        this.showCreateFacilityModal = false;
        this.fetchFacilites();
      },
      manageSync(facilityId) {
        return {
          name: PageNames.MANAGE_SYNC_SCHEDULE,
          facilityId,
          params: {
            facilityId,
          },
        };
      },
      showFacilityRemovedSnackbar(facilityName) {
        this.createSnackbar(
          this.$tr('facilityRemovedSnackbar', {
            facilityName,
          }),
        );
      },
      handleRemoveSuccess(taskId) {
        this.taskIdsToWatch.push(taskId);
        this.facilityForRemoval = null;
      },
      handleKDPSync(facility) {
        this.facilityForSync = null;
        this.facilityForRegister = null;
        this.startKdpSyncTask(facility.id)
          .then(task => {
            this.handleStartSyncSuccess(task);
          })
          .catch(() => {
            this.$emit('failure');
          });
      },
      handlePeerSync(peerData, facility) {
        this.facilityForSync = null;
        this.startPeerSyncTask({
          facility: facility.id,
          device_id: peerData.id,
        })
          .then(task => {
            this.handleStartSyncSuccess(task);
          })
          .catch(() => {
            this.$emit('failure');
          });
      },
      handleSelect(option) {
        if (option.value == ImportFacility) {
          this.showImportModal = true;
        } else {
          this.showCreateFacilityModal = true;
        }
      },
    },
    $trs: {
      syncAllAction: {
        message: 'Sync all',
        context:
          'Label for a button used to synchronize all facilities at once with the data portal',
      },
      facilityRemovedSnackbar: {
        message: "Removed '{facilityName}' from this device",
        context:
          "Notification that appears after a facility has been deleted. For example, \"Removed 'Zuk Village' from this device'.",
      },
      createFacilityLabel: {
        message: 'Add facility',
        context: 'Label for a button used to create new facility.',
      },
      importFacilityLabel: {
        message: 'Import facility',
        context: 'Label for the dropdown option of import facility',
      },
      createNewFacilityLabel: {
        message: 'Create new facility',
        context: 'Label for the dropdown option of create new facility',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '../../styles/definitions';

  .device-container {
    @include device-kpagecontainer;
  }

  .buttons {
    margin: auto;
  }

  .button-col {
    padding: 4px;
    padding-top: 8px;
    text-align: right;
    vertical-align: middle;

    .sync {
      margin-right: 0;
    }
  }

</style>
