<template>

  <KPageContainer :style="containerStyle">
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
            <td
              :style="tableCellStyle"
              class="button-col"
            >
              <KButtonGroup style="margin-top: 12px; overflow: visible">
                <KButton
                  appearance="raised-button"
                  :text="$tr('sync')"
                  :disabled="isSyncing"
                  @click="displayModal(Modals.SYNC_FACILITY)"
                />
                <KIconButton
                  ref="moreOptionsButton"
                  data-test="moreOptionsButton"
                  icon="optionsHorizontal"
                  :tooltip="coreString('optionsLabel')"
                  :ariaLabel="coreString('optionsLabel')"
                  :disabled="isSyncing"
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
                      :style="{ cursor: 'pointer', textAlign: 'left' }"
                      :label="coreString('manageSyncAction')"
                      @select="manageSyncAction()"
                    />
                    <CoreMenuOption
                      :style="{ cursor: 'pointer', textAlign: 'left' }"
                      :label="$tr('register')"
                      @select="handleRegister()"
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
      :displaySkipOption="false"
      @success="handleValidateSuccess"
      @cancel="closeModal"
      @skip="handleKDPSync"
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
      @syncKDP="handleKDPSync"
      @syncPeer="handlePeerSync"
    />
  </KPageContainer>

</template>


<script>

  import CoreTable from 'kolibri/components/CoreTable';
  import FacilityNameAndSyncStatus from 'kolibri-common/components/syncComponentSet/FacilityNameAndSyncStatus';
  import ConfirmationRegisterModal from 'kolibri-common/components/syncComponentSet/ConfirmationRegisterModal';
  import RegisterFacilityModal from 'kolibri-common/components/syncComponentSet/RegisterFacilityModal';
  import SyncFacilityModalGroup from 'kolibri-common/components/syncComponentSet/SyncFacilityModalGroup';
  import commonSyncElements from 'kolibri-common/mixins/commonSyncElements';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import TaskResource from 'kolibri/apiResources/TaskResource';
  import FacilityResource from 'kolibri-common/apiResources/FacilityResource';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import CoreMenu from 'kolibri/components/CoreMenu';
  import CoreMenuOption from 'kolibri/components/CoreMenu/CoreMenuOption';
  import { TaskStatuses } from 'kolibri-common/utils/syncTaskUtils';
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
    setup() {
      const { windowIsLarge, windowIsMedium, windowIsSmall } = useKResponsiveWindow();
      return {
        windowIsLarge,
        windowIsMedium,
        windowIsSmall,
      };
    },
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
      containerStyle() {
        if (this.windowIsMedium || this.windowIsLarge) {
          return {
            height: '300px',
            overflow: 'visible',
            marginBottom: '24px',
          };
        }
        return {
          marginBottom: '24px',
        };
      },
      tableCellStyle() {
        if (this.windowIsSmall || this.windowIsMedium) {
          return {
            padding: '8px 4px 4px',
            maxWidth: '180px',
          };
        } else {
          return {
            maxWidth: '100px',
          };
        }
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
          },
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
            TaskResource.clear(this.syncTaskId);
            this.syncTaskId = '';
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
      },
      handleSyncFacilityFailure() {
        this.syncHasFailed = true;
      },
      handleRegister() {
        this.closeMenu();
        this.displayModal(Modals.REGISTER_FACILITY);
      },
      handleKDPSync() {
        this.closeModal();
        this.startKdpSyncTask(this.facility.id)
          .then(task => {
            this.handleSyncFacilitySuccess(task.id);
          })
          .catch(() => {
            this.handleSyncFacilityFailure();
          });
      },
      handlePeerSync(peerData) {
        this.closeModal();
        this.startPeerSyncTask({
          facility: this.facility.id,
          device_id: peerData.id,
        })
          .then(task => {
            this.handleSyncFacilitySuccess(task.id);
          })
          .catch(() => {
            this.handleSyncFacilityFailure();
          });
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

  /deep/ .button-group-item {
    height: max-content;
    margin-bottom: 8px;
  }

</style>
