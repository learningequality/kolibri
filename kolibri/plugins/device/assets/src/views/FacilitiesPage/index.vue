<template>

  <div>
    <HeaderWithOptions :headerText="coreString('facilitiesLabel')">
      <template #options>
        <KButtonGroup>
          <KButton
            :text="$tr('syncAllAction')"
            @click="showSyncAllModal = true"
          />
          <KButton
            :text="$tr('importFacilityAction')"
            primary
            @click="showImportModal = true"
          />
        </KButtonGroup>
      </template>
    </HeaderWithOptions>

    <TasksBar
      v-if="facilityTasks.length > 0"
      :tasks="facilityTasks"
      :taskManagerLink="{ name: 'FACILITIES_TASKS_PAGE' }"
      @clearall="handleClickClearAll"
    />

    <CoreTable>
      <template #headers>
        <th>{{ coreString('facilityLabel') }}</th>
      </template>
      <template #tbody>
        <tbody>
          <tr v-for="(facility, idx) in facilities" :key="idx">
            <td>
              <FacilityNameAndSyncStatus
                :facility="facility"
                :isSyncing="facilityIsSyncing(facility)"
                :isDeleting="facilityIsDeleting(facility)"
                :syncHasFailed="facility.syncHasFailed"
              />
            </td>
            <td class="button-col">
              <KButtonGroup>
                <KButton
                  :text="coreString('syncAction')"
                  appearance="flat-button"
                  @click="facilityForSync = facility"
                />
                <KDropdownMenu
                  :text="coreString('optionsLabel')"
                  :options="facilityOptions(facility)"
                  appearance="flat-button"
                  @select="handleOptionSelect($event.value, facility)"
                />
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

    <!-- NOTE similar code for KDP Registration in SyncInterface -->
    <template v-if="Boolean(facilityForRegister)">
      <RegisterFacilityModal
        v-if="!kdpProject"
        :facility="facilityForRegister"
        @success="handleValidateSuccess"
        @cancel="clearRegistrationState"
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
      @success="handleStartSyncSuccess"
    />
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonSyncElements from 'kolibri.coreVue.mixins.commonSyncElements';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import { FacilityResource } from 'kolibri.resources';
  import {
    FacilityNameAndSyncStatus,
    RegisterFacilityModal,
    ConfirmationRegisterModal,
    SyncFacilityModalGroup,
  } from 'kolibri.coreVue.componentSets.sync';
  import TasksBar from '../ManageContentPage/TasksBar';
  import HeaderWithOptions from '../HeaderWithOptions';
  import { TaskStatuses, TaskTypes } from '../../constants';
  import RemoveFacilityModal from './RemoveFacilityModal';
  import SyncAllFacilitiesModal from './SyncAllFacilitiesModal';
  import ImportFacilityModalGroup from './ImportFacilityModalGroup';
  import facilityTaskQueue from './facilityTasksQueue';

  const Options = Object.freeze({
    REGISTER: 'REGISTER',
    REMOVE: 'REMOVE',
  });

  export default {
    name: 'FacilitiesPage',
    metaInfo() {
      return {
        title: this.coreString('facilitiesLabel'),
      };
    },
    components: {
      ConfirmationRegisterModal,
      CoreTable,
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
    data() {
      return {
        showSyncAllModal: false,
        showImportModal: false,
        facilities: [],
        facilityForSync: null,
        facilityForRemoval: null,
        facilityForRegister: null,
        kdpProject: null, // { name, token }
        taskIdsToWatch: [],
        // (facilityTaskQueue) facilityTasks
      };
    },
    watch: {
      // Update facilities whenever a watched task completes
      facilityTasks(newTasks) {
        for (let index in newTasks) {
          const task = newTasks[index];
          if (this.taskIdsToWatch.includes(task.id)) {
            if (task.status === TaskStatuses.COMPLETED) {
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
      this.fetchFacilites();
    },
    methods: {
      facilityOptions(facility) {
        return [
          {
            label: this.coreString('registerAction'),
            value: Options.REGISTER,
            disabled: facility.dataset.registered,
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
      handleStartSyncSuccess(taskId) {
        this.taskIdsToWatch.push(taskId);
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
      showFacilityRemovedSnackbar(facilityName) {
        this.$store.dispatch(
          'createSnackbar',
          this.$tr('facilityRemovedSnackbar', {
            facilityName,
          })
        );
      },
      handleRemoveSuccess(taskId) {
        this.taskIdsToWatch.push(taskId);
        this.facilityForRemoval = null;
      },
    },
    $trs: {
      syncAllAction: {
        message: 'Sync all',
        context:
          'Label for a button used to synchronize all facilities at once with the data portal',
      },
      importFacilityAction: {
        message: 'Import facility',
        context: 'Label for a button used to import a facility on the device',
      },
      facilityRemovedSnackbar: {
        message: "Removed '{facilityName}' from this device",
        context: 'Notification that appears after a facility has been deleted',
      },
    },
  };

</script>


<style lang="scss" scoped>

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
