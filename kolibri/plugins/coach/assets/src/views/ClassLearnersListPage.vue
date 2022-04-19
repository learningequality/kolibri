<template>

  <CoreBase
    :immersivePage="true"
    immersivePageIcon="back"
    :immersivePagePrimary="false"
    :immersivePageRoute="backlink"
    :appBarTitle="$store.state.classSummary.name"
  >
    <KPageContainer>
      <h1>{{ $tr('pageHeader', { className: $store.state.classSummary.name }) }} </h1>
      <KButton
        :text="$tr('howToTroubleshootModalHeader')"
        appearance="basic-link"
        class="troubleshooting-modal-link"
        @click="displayTroubleshootModal = true"
      />
      <KModal
        v-if="displayTroubleshootModal"
        :title="$tr('howToTroubleshootModalHeader')"
        size="medium"
        :submitText="$tr('close')"
        @submit="displayTroubleshootModal = false"
      >
        <div v-for="status in syncStatusOptions" :key="status.id" class="status-option-display">
          <SyncStatusDisplay :syncStatus="status" displaySize="large-bold" />
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
                <ElapsedTime
                  :date="mapLastSyncedTimeToLearner(learner.id)"
                />
              </td>
            </tr>
          </tbody>
        </template>
      </CoreTable>
    </KPageContainer>
  </CoreBase>

</template>


<script>

  import CoreBase from 'kolibri.coreVue.components.CoreBase';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import ElapsedTime from 'kolibri.coreVue.components.ElapsedTime';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { SyncStatus } from 'kolibri.coreVue.vuex.constants';
  import { mapState, mapActions } from 'vuex';
  import SyncStatusDisplay from '../../../../../core/assets/src/views/SyncStatusDisplay';
  import SyncStatusDescription from '../../../../../core/assets/src/views/SyncStatusDescription';

  export default {
    name: 'ClassLearnersListPage',
    metaInfo() {
      return {
        title: this.$tr('pageHeader', { className: this.className }),
      };
    },
    components: {
      CoreBase,
      CoreTable,
      ElapsedTime,
      SyncStatusDisplay,
      SyncStatusDescription,
    },
    mixins: [commonCoreStrings],
    data: function() {
      return {
        displayTroubleshootModal: false,
        classSyncStatusList: {},
        // poll every 10 seconds
        pollingInterval: 10000,
      };
    },
    computed: {
      ...mapState('classSummary', ['learnerMap']),
      syncStatusOptions() {
        let options = [];
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
        let backRoute;
        if (this.$route.query.last === 'homepage') {
          backRoute = this.$router.getRoute('HomePage');
        } else {
          backRoute = this.$router.getRoute('ReportsQuizListPage');
        }
        return backRoute;
      },
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
          for (let status of data) {
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
      close: {
        message: 'Close',
        context: 'ClassLearnersListPage.close\n\n-- CONTEXT --',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .troubleshooting-modal-link {
    margin-bottom: 40px;
  }

  /deep/ .title {
    padding-bottom: 24px;
    font-size: 18px;
  }

  /deep/ .content {
    font-size: 14px;
  }

  .status-option-display {
    padding-bottom: 8px;
  }

</style>
