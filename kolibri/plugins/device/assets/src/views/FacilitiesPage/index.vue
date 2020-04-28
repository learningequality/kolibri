<template>

  <div>

    <HeaderWithOptions :headerText="coreString('facilitiesLabel')">
      <template #options>
        <KButton
          :text="$tr('syncAllAction')"
          @click="showSyncAllModal = true"
        />
        <KButton
          :text="$tr('importFacilityAction')"
          primary
          @click="showImportModal = true"
        />
      </template>
    </HeaderWithOptions>

    <TasksBar
      v-if="facilitiesTasks.length > 0"
      :tasks="facilitiesTasks"
      :taskManagerLink="{ name: 'FACILITIES_TASKS_PAGE' }"
      @clearall="handleClickClearAll"
    />

    <CoreTable>
      <thead slot="thead">
        <tr>
          <th>{{ coreString('facilityLabel') }}</th>
        </tr>
      </thead>
      <tbody slot="tbody">
        <tr v-for="(facility, idx) in facilities" :key="idx">
          <td>
            <FacilityNameAndSyncStatus :facility="facility" />
          </td>
          <td class="button-col">
            <div>
              <KButton
                :text="coreString('syncAction')"
                @click="facilityForSync = facility"
              />
              <KDropdownMenu
                :text="coreString('optionsLabel')"
                :options="options"
                appearance="flat-button"
                @select="handleOptionSelect($event.value, facility)"
              />
            </div>
          </td>
        </tr>
      </tbody>
    </CoreTable>

    <RemoveFacilityModal
      v-if="Boolean(facilityForRemoval)"
      :canRemove="facilityForRemoval.canRemove"
      :facility="facilityForRemoval"
      @submit="handleSubmitRemoval"
      @cancel="facilityForRemoval = null"
    />

    <SyncAllFacilitiesModal
      v-if="showSyncAllModal"
      @submit="showSyncAllModal = false"
      @cancel="showSyncAllModal = false"
    />

    <ImportFacilityModalGroup
      v-if="showImportModal"
      @submit="showImportModal = false"
      @cancel="showImportModal = false"
    />

    <RegisterFacilityModal
      v-if="Boolean(facilityForRegister)"
      :facility="facilityForRegister"
      @cancel="facilityForRegister = null"
    />

    <SyncFacilityModalGroup
      v-if="Boolean(facilityForSync)"
      @submit="facilityForSync = null"
      @cancel="facilityForSync = null"
    />
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import {
    FacilityNameAndSyncStatus,
    RegisterFacilityModal,
  } from 'kolibri.coreVue.componentSets.sync';
  import TasksBar from '../ManageContentPage/TasksBar.vue';
  import HeaderWithOptions from '../HeaderWithOptions';
  import RemoveFacilityModal from './RemoveFacilityModal';
  import SyncAllFacilitiesModal from './SyncAllFacilitiesModal';
  import SyncFacilityModalGroup from './SyncFacilityModalGroup';
  import ImportFacilityModalGroup from './ImportFacilityModalGroup';

  export default {
    name: 'FacilitiesPage',
    components: {
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
    mixins: [commonCoreStrings],
    props: {},
    data() {
      return {
        showSyncAllModal: false,
        showImportModal: false,
        facilityForSync: null,
        facilityForRemoval: null,
        facilityForRegister: null,
        facilitiesTasks: [
          {
            status: 'COMPLETED',
          },
          {
            status: 'RUNNING',
          },
        ],
      };
    },
    computed: {
      options() {
        return [
          {
            label: this.coreString('registerAction'),
            value: 'REGISTER',
          },
          {
            label: this.coreString('removeAction'),
            value: 'REMOVE',
          },
        ];
      },
      facilities() {
        return [
          {
            name: 'Atkinson Hall (d81c)',
            id: 'D81C',
            syncing: false,
            dataset: {
              registered: false,
            },
            last_sync_failed: false,
            last_synced: null,
            canRemove: true,
          },
          {
            name: 'Atkinson Hall (d81c)',
            id: 'D81C',
            syncing: true,
            dataset: {
              registered: true,
            },
            last_sync_failed: false,
            last_synced: null,
            canRemove: true,
          },
          {
            name: 'Atkinson Hall (d81c)',
            id: 'D81C',
            syncing: false,
            dataset: {
              registered: true,
            },
            last_sync_failed: false,
            last_synced: 1588036798109,
            canRemove: true,
          },
          {
            name: 'Atkinson Hall (d81c)',
            id: 'D81C',
            syncing: false,
            dataset: {
              registered: true,
            },
            last_sync_failed: true,
            last_synced: 1588036798109,
            canRemove: true,
          },
          // {
          //   name: 'Cannot remove',
          //   id: '4321',
          //   canRemove: false,
          // },
        ];
      },
    },
    methods: {
      handleOptionSelect(option, facility) {
        if (option === 'REMOVE') {
          this.facilityForRemoval = facility;
        } else if (option === 'REGISTER') {
          this.facilityForRegister = facility;
        }
      },
      handleSubmitRemoval() {
        if (this.facilityForRemoval) {
          const facilityName = this.facilityForRemoval.name;
          this.facilityForRemoval = null;
          this.$store.dispatch(
            'createSnackbar',
            this.$tr('facilityRemovedSnackbar', {
              facilityName,
            })
          );
        }
      },
      handleClickClearAll() {
        this.facilitiesTasks = [];
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
        message: `Removed '{facilityName}' from this device`,
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

    .sync {
      margin-right: 0;
    }
  }

</style>
