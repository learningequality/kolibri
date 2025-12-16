<template>

  <CoachImmersivePage
    :appBarTitle="className"
    icon="back"
    :route="backlink"
    :pageTitle="$tr('pageHeader', { className: className })"
  >
    <KPageContainer>
      <h1>{{ $tr('pageHeader', { className: className }) }}</h1>
      <KButton
        :text="$tr('howToTroubleshootModalHeader')"
        appearance="basic-link"
        class="troubleshooting-modal-link"
        @click="displayTroubleshootModal = true"
      />
      <template>
        <div aria-live="polite">
          <StorageNotificationBanner v-if="learnerHasInsufficientStorage" />
        </div>
      </template>

      <KModal
        v-if="displayTroubleshootModal"
        :title="$tr('howToTroubleshootModalHeader')"
        size="medium"
        :submitText="coreString('closeAction')"
        @submit="displayTroubleshootModal = false"
      >
        <div
          v-for="status in syncStatusOptions"
          :key="status.id"
          class="status-option-display"
        >
          <SyncStatusDisplay
            :syncStatus="status"
            displaySize="large-bold"
          />
          <SyncStatusDescription :syncStatus="status" />
        </div>
      </KModal>
      <CoreTable>
        <template #headers>
          <th>
            {{ coreString('fullNameLabel') }}
          </th>
          <th>{{ coreString('usernameLabel') }}</th>
          <th>{{ $tr('deviceStatus') }}</th>
          <th>{{ $tr('lastSyncedStatus') }}</th>
        </template>

        <template #tbody>
          <tbody>
            <tr
              v-for="learner in learnerMap"
              :key="learner.id"
            >
              <td>
                <KLabeledIcon
                  icon="person"
                  :label="learner.name"
                />
              </td>
              <td>
                <span dir="auto">
                  {{ learner.username }}
                </span>
              </td>
              <td>
                <SyncStatusDisplay
                  :syncStatus="mapSyncStatusOptionToLearner(learner.id)"
                  displaySize="large"
                />
              </td>
              <td>
                <ElapsedTime :date="mapLastSyncedTimeToLearner(learner.id)" />
              </td>
            </tr>
          </tbody>
        </template>
      </CoreTable>
    </KPageContainer>
  </CoachImmersivePage>

</template>


<script>

  import CoreTable from 'kolibri/components/CoreTable';
  import ElapsedTime from 'kolibri-common/components/ElapsedTime';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { SyncStatus } from 'kolibri/constants';
  import { mapState, mapActions } from 'vuex';
  import SyncStatusDisplay from 'kolibri/components/SyncStatusDisplay';
  import CoachImmersivePage from '../views/CoachImmersivePage';
  import { PageNames } from '../constants';
  import SyncStatusDescription from './common/SyncStatusDescription';
  import StorageNotificationBanner from './StorageNotificationBanner';

  export default {
    name: 'ClassLearnersListPage',
    components: {
      CoreTable,
      ElapsedTime,
      CoachImmersivePage,
      SyncStatusDisplay,
      SyncStatusDescription,
      StorageNotificationBanner,
    },
    mixins: [commonCoreStrings],
    data: function () {
      return {
        prevRoute: null,
        displayTroubleshootModal: false,
        classSyncStatusList: {},
        // poll every 10 seconds
        pollingInterval: 10000,
      };
    },
    computed: {
      ...mapState('classSummary', ['learnerMap']),
      className() {
        return this.$store.state.classSummary.name;
      },
      syncStatusOptions() {
        const options = [];
        for (const [value] of Object.entries(SyncStatus)) {
          // skip displaying the "not recently synced" "unable to sync"
          // so they can be as separate option, per Figma design
          if (value !== SyncStatus.NOT_RECENTLY_SYNCED && value !== SyncStatus.UNABLE_TO_SYNC) {
            options.push(value);
          }
        }
        return options;
      },
      backlink() {
        if (this.$route.query.last === 'homepage') {
          return { name: PageNames.HOME_PAGE, params: { classId: this.$route.params.classId } };
        } else if (this.prevRoute) {
          return this.prevRoute;
        } else {
          return { name: PageNames.LESSONS_ROOT, params: { classId: this.$route.params.classId } };
        }
      },
      learnerHasInsufficientStorage() {
        for (const learner in this.learnerMap) {
          const learnerDevice = this.classSyncStatusList[learner];
          if (learnerDevice && learnerDevice.status === SyncStatus.INSUFFICIENT_STORAGE) {
            return true;
          }
        }
        return false;
      },
    },
    beforeRouteEnter(to, from, next) {
      next(vm => {
        vm.prevRoute = from;
      });
    },
    mounted() {
      this.isPolling = true;
      this.pollClassListSyncStatuses();
    },
    beforeDestroy() {
      this.isPolling = false;
    },
    methods: {
      ...mapActions(['fetchUserSyncStatus']),
      mapLastSyncedTimeToLearner(learnerId) {
        const learnerSyncData = this.classSyncStatusList[learnerId];
        if (learnerSyncData) {
          return learnerSyncData.last_synced;
        }
        return null;
      },
      mapSyncStatusOptionToLearner(learnerId) {
        const learnerSyncData = this.classSyncStatusList[learnerId];
        if (learnerSyncData) {
          return learnerSyncData.status;
        }
        return SyncStatus.NOT_CONNECTED;
      },
      pollClassListSyncStatuses() {
        this.fetchUserSyncStatus({ member_of: this.$route.params.classId }).then(data => {
          const statuses = {};
          for (const status of data) {
            statuses[status.user] = status;
          }
          this.classSyncStatusList = statuses;
        });
        if (this.isPolling) {
          setTimeout(() => {
            this.pollClassListSyncStatuses();
          }, this.pollingInterval);
        }
      },
    },
    $trs: {
      pageHeader: {
        message: "Learners in '{className}'",
        context: 'Main page heading. Refers to a list of learners in a specific class.',
      },
      deviceStatus: {
        message: 'Device status',
        context: "Indicates the status of an individual learner's device.",
      },
      lastSyncedStatus: {
        message: 'Last synced',
        context:
          "Header for the table column in the 'Class learners' page that displays the last time each device synced with the server.",
      },
      howToTroubleshootModalHeader: {
        message: 'Information about sync statuses',
        context:
          'Link to open additional information about statuses. It shows descriptions of what each status means.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .troubleshooting-modal-link {
    margin-bottom: 25px;
  }

  /deep/ .title {
    padding-bottom: 24px;
    font-size: 18px;
  }

  /deep/ .content {
    font-size: 14px;
  }

  .status-option-display {
    padding-bottom: 3px;
  }

</style>
