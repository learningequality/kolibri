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
      :canRemove="facilityCanBeRemoved(facilityForRemoval)"
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
      @submit="facilityForSync = null"
      @cancel="facilityForSync = null"
    />
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import { FacilityResource } from 'kolibri.resources';
  import {
    FacilityNameAndSyncStatus,
    RegisterFacilityModal,
    ConfirmationRegisterModal,
  } from 'kolibri.coreVue.componentSets.sync';
  import TasksBar from '../ManageContentPage/TasksBar';
  import HeaderWithOptions from '../HeaderWithOptions';
  import RemoveFacilityModal from './RemoveFacilityModal';
  import SyncAllFacilitiesModal from './SyncAllFacilitiesModal';
  import SyncFacilityModalGroup from './SyncFacilityModalGroup';
  import ImportFacilityModalGroup from './ImportFacilityModalGroup';

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
    mixins: [commonCoreStrings],
    props: {},
    data() {
      return {
        showSyncAllModal: false,
        showImportModal: false,
        facilities: [],
        facilityForSync: null,
        facilityForRemoval: null,
        facilityForRegister: null,
        kdpProject: null,
        facilitiesTasks: [],
      };
    },
    computed: {
      options() {
        return [
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
    },
    beforeMount() {
      this.fetchFacilites();
      // TODO start polling for tasks
    },
    methods: {
      facilityCanBeRemoved() {
        // TODO return false if user is in the facility (determine from session)
        return true;
      },
      handleOptionSelect(option, facility) {
        if (option === Options.REMOVE) {
          this.facilityForRemoval = facility;
        } else if (option === Options.REGISTER) {
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
      fetchFacilites() {
        return FacilityResource.fetchCollection({ force: true }).then(facilities => {
          this.facilities = [...facilities];
        });
      },
      handleClickClearAll() {
        this.facilitiesTasks = [];
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
