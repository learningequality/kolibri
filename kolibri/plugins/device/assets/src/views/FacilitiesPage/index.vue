<template>

  <div>

    <HeaderWithOptions :headerText="coreString('facilitiesLabel')">
      <template #options>
        <KButton
          :text="$tr('syncAllAction')"
          @click="showSyncAllFacilitiesModal = true"
        />
        <KButton
          :text="$tr('importFacilityAction')"
          primary
          @click="showImportFacilityModal = true"
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
            <div>
              <h3>
                <!-- Facility name with ID goes here -->
                {{ coreString('nameWithIdInParens', {
                  name: facility.name,
                  id: facility.id.slice(0, 4)
                }) }}
              </h3>
              Sync Status Widget Goes here
            </div>
          </td>
          <td class="button-col">
            <div>
              <KButton :text="coreString('syncAction')" />
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
      v-if="Boolean(facilitySelectedForRemoval)"
      :canRemove="facilitySelectedForRemoval.canRemove"
      :facility="facilitySelectedForRemoval"
      @submit="handleSubmitRemoval"
      @cancel="facilitySelectedForRemoval = null"
    />
    <SyncAllFacilitiesModal
      v-if="showSyncAllFacilitiesModal"
      @submit="showSyncAllFacilitiesModal = false"
      @cancel="showSyncAllFacilitiesModal = false"
    />
    <ImportFacilityModal
      v-if="showImportFacilityModal"
      @submit="showImportFacilityModal = false"
      @cancel="showImportFacilityModal = false"
    />
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import TasksBar from '../ManageContentPage/TasksBar.vue';
  import HeaderWithOptions from '../HeaderWithOptions';
  import RemoveFacilityModal from './RemoveFacilityModal';
  import SyncAllFacilitiesModal from './SyncAllFacilitiesModal';
  import ImportFacilityModal from './ImportFacilityModal';

  export default {
    name: 'FacilitiesPage',
    components: {
      CoreTable,
      HeaderWithOptions,
      ImportFacilityModal,
      RemoveFacilityModal,
      SyncAllFacilitiesModal,
      TasksBar,
    },
    mixins: [commonCoreStrings],
    props: {},
    data() {
      return {
        showSyncAllFacilitiesModal: false,
        showImportFacilityModal: false,
        showRemoveFacilityModal: false,
        facilitySelectedForRemoval: null,
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
            name: 'Can remove',
            id: '1234',
            canRemove: true,
          },
          {
            name: 'Cannot remove',
            id: '4321',
            canRemove: false,
          },
        ];
      },
    },
    methods: {
      handleOptionSelect(option, facility) {
        if (option === 'REMOVE') {
          this.facilitySelectedForRemoval = facility;
          this.showRemoveFacilityModal = true;
        }
      },
      handleSubmitRemoval() {
        if (this.facilitySelectedForRemoval) {
          const facilityName = this.facilitySelectedForRemoval.name;
          this.facilitySelectedForRemoval = null;
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
