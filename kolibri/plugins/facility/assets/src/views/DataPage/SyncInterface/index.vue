<template>

  <KPageContainer>

    <h1>{{ $tr('syncData') }}</h1>
    <p>
      <KButton
        appearance="basic-link"
        :text="$tr('learnMore')"
        @click="displayModal(Modals.PRIVACY)"
      />
    </p>

    <CoreTable>
      <template #headers>
        <th>{{ $tr('facility') }}</th>
      </template>
      <template #tbody>
        <tbody>
          <tr v-if="facility">
            <td>
              <FacilityNameAndSyncStatus
                :facility="facility"
                :isSyncing="isSyncing"
                :syncHasFailed="syncHasFailed"
                :goToRoute="manageSyncRoute"
              />
            </td>
            <td class="button-col">
              <KButtonGroup style="margin-top: 8px; overflow: visible">
                <KButton
                  v-if="!facility.dataset.registered"
                  appearance="raised-button"
                  :text="$tr('register')"
                  @click="displayModal(Modals.REGISTER_FACILITY)"
                />
                <KButton
                  v-else-if="!Boolean(syncTaskId)"
                  appearance="raised-button"
                  :text="$tr('sync')"
                  @click="displayModal(Modals.SYNC_FACILITY)"
                />
                <KIconButton
                  ref="moreOptionsButton"
                  data-test="moreOptionsButton"
                  icon="optionsHorizontal"
                  :tooltip="coreString('optionsLabel')"
                  :ariaLabel="coreString('optionsLabel')"
                  @click="toggleMenu"
                />
                <CoreMenu
                  v-show="isMenuOpen"
                  ref="menu"
                  class="menu"
                  :raised="true"
                  :isOpen="isMenuOpen"
                  :containFocus="true"
                  @close="closeMenu"
                  @shouldFocusFirstEl="findFirstEl()"
                >
                  <template #options>
                    <CoreMenuOption
                      :style="{ 'cursor': 'pointer', textAlign: 'left' }"
                      :label="coreString('manageSyncAction')"
                      @select="manageSyncAction()"
                    />
                    <CoreMenuOption
                      v-if="facility.dataset.registered"
                      :style="{ 'cursor': 'pointer', textAlign: 'left' }"
                      :label="$tr('register')"
                      @select="displayModal(Modals.REGISTER_FACILITY)"
                    />
                    <CoreMenuOption
                      v-else
                      :style="{ 'cursor': 'pointer', textAlign: 'left' }"
                      :label="$tr('sync')"
                      @select="displayModal(Modals.SYNC_FACILITY)"
                    />
                  </template>
                </CoreMenu>
              </KButtonGroup>
            </td>
          </tr>
        </tbody>
      </template>
    </CoreTable>
    <PrivacyModal
      v-if="modalShown === Modals.PRIVACY"
      @cancel="closeModal"
    />

    <RegisterFacilityModal
      v-if="modalShown === Modals.REGISTER_FACILITY"
      @success="handleValidateSuccess"
      @cancel="closeModal"
    />
    <ConfirmationRegisterModal
      v-if="modalShown === Modals.CONFIRMATION_REGISTER"
      :targetFacility="facility"
      :projectName="kdpProject.name"
      :token="kdpProject.token"
      @success="handleConfirmationSuccess"
      @cancel="closeModal"
    />

    <SyncFacilityModalGroup
      v-if="modalShown === Modals.SYNC_FACILITY"
      :facilityForSync="facility"
      @close="closeModal"
      @success="handleSyncFacilitySuccess"
      @failure="handleSyncFacilityFailure"
    />

  </KPageContainer>

</template>


<script>

  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import {
    FacilityNameAndSyncStatus,
    ConfirmationRegisterModal,
    RegisterFacilityModal,
    SyncFacilityModalGroup,
  } from 'kolibri.coreVue.componentSets.sync';
  import commonSyncElements from 'kolibri.coreVue.mixins.commonSyncElements';
  import { TaskResource, FacilityResource } from 'kolibri.resources';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import CoreMenu from 'kolibri.coreVue.components.CoreMenu';
  import CoreMenuOption from 'kolibri.coreVue.components.CoreMenuOption';
  import { TaskStatuses } from 'kolibri.utils.syncTaskUtils';
  import { SyncPageNames } from 'kolibri-common/components/SyncSchedule/constants';
  import PrivacyModal from './PrivacyModal';

  const Modals = Object.freeze({
    SYNC_FACILITY: 'SYNC_FACILITY',
    CONFIRMATION_REGISTER: 'CONFIRMATION_REGISTER',
    REGISTER_FACILITY: 'REGISTER_FACILITY',
    PRIVACY: 'PRIVACY',
  });

  export default {
    name: 'SyncInterface',
    components: {
      CoreTable,
      PrivacyModal,
      FacilityNameAndSyncStatus,
      RegisterFacilityModal,
      ConfirmationRegisterModal,
      SyncFacilityModalGroup,
      CoreMenu,
      CoreMenuOption,
    },
    mixins: [commonSyncElements, commonCoreStrings],
    data() {
      return {
        facility: null,
        kdpProject: null, // { name, token }
        modalShown: null,
        syncTaskId: '',
        isSyncing: false,
        syncHasFailed: false,
        Modals,
        isMenuOpen: false,
      };
    },
    computed: {
      manageSyncRoute() {
        return {
          name: SyncPageNames.MANAGE_SYNC_SCHEDULE,
          params: {
            facility_id: this.facility.id,
          },
        };
      },
    },
    beforeMount() {
      this.fetchFacility();
    },
    beforeDestroy() {
      this.syncTaskId = '';
    },
    methods: {
      manageSyncAction() {
        this.$router.push(this.manageSyncRoute);
      },
      fetchFacility() {
        FacilityResource.fetchModel({ id: this.$store.getters.activeFacilityId, force: true }).then(
          facility => {
            this.facility = { ...facility };
          }
        );
      },
      closeModal() {
        this.modalShown = null;
      },
      displayModal(modal) {
        this.modalShown = modal;
      },
      pollSyncTask() {
        // Like facilityTaskQueue, just keep polling until component is destroyed
        TaskResource.get(this.syncTaskId).then(task => {
          if (task.clearable) {
            this.isSyncing = false;
            this.syncTaskId = '';
            TaskResource.clear(this.syncTaskId);
            if (task.status === TaskStatuses.FAILED) {
              this.syncHasFailed = true;
            } else if (task.status === TaskStatuses.COMPLETED) {
              this.fetchFacility();
            }
          } else if (this.syncTaskId) {
            setTimeout(() => {
              this.pollSyncTask();
            }, 2000);
          }
        });
      },
      handleValidateSuccess({ name, token }) {
        this.kdpProject = { name, token };
        this.displayModal(Modals.CONFIRMATION_REGISTER);
      },
      handleConfirmationSuccess(payload) {
        this.$store.commit('manageCSV/SET_REGISTERED', payload);
        this.facility.dataset.registered = true;
        this.closeModal();
      },
      handleSyncFacilitySuccess(taskId) {
        this.isSyncing = true;
        this.syncTaskId = taskId;
        this.pollSyncTask();
        this.closeModal();
      },
      handleSyncFacilityFailure() {
        this.syncHasFailed = true;
        this.closeModal();
      },
      closeMenu({ focusMoreOptionsButton = true } = {}) {
        this.isMenuOpen = false;
        if (!focusMoreOptionsButton) {
          return;
        }
        this.$nextTick(() => {
          this.$refs.moreOptionsButton.$el.focus();
        });
      },
      toggleMenu() {
        this.isMenuOpen = !this.isMenuOpen;
        if (!this.isMenuOpen) {
          return;
        }
        this.$nextTick(() => {
          this.$refs.menu.$el.focus();
        });
      },
      findFirstEl() {
        this.$nextTick(() => {
          this.$refs.menu.focusFirstEl();
        });
      },
    },
    $trs: {
      syncData: {
        message: 'Sync facility data',
        context:
          'Option to sync the current facility data with the Learning Equality Kolibri Data Portal in the cloud.',
      },
      learnMore: {
        message: 'Usage and privacy',
        context:
          "A link to 'Usage and privacy' information which pops up in a window when clicked.",
      },
      facility: {
        message: 'Facility',
        context: "Refers to the facility on the 'Sync Facility Data' window.",
      },
      register: {
        message: 'Register',
        context: 'Describes the button to register a new facility.',
      },
      sync: {
        message: 'Sync',
        context:
          "Describes the 'sync' button which is used to synchronize data from a facility with the project on the Kolibri Data Portal.",
      },
    },
  };

</script>


<style lang="scss" scoped>

  /* derived from .core-table-button-col */
  .button-col {
    padding: 4px;
    padding-top: 8px;
    text-align: right;
  }

  .name {
    display: inline-block;
    margin-right: 8px;
  }

  .loader {
    top: 3px;
    display: inline-block;
    margin-right: 8px;
  }

</style>
