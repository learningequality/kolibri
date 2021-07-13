<template>

  <CoreBase
    :immersivePage="true"
    immersivePageIcon="back"
    :immersivePagePrimary="false"
    :immersivePageRoute="$router.getRoute('HomePage')"
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
        <p>{{ $tr('howToTroubleshootModalSubheader') }}</p>
        <div v-for="status in syncStatusOptions" :key="status.id">
          <SyncStatusDisplay :syncStatus="status" displaySize="sync-status-large" />
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
                  displaySize="sync-status-large"
                />
              </td>
              <td>
                <span dir="auto">
                  {{ mapLastSynctedTimeToLearner(learner.id) }}
                </span>
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
      SyncStatusDisplay,
      SyncStatusDescription,
    },
    mixins: [commonCoreStrings],
    data: function() {
      return {
        displayTroubleshootModal: false,
        classSyncStatusObject: [],
      };
    },
    computed: {
      ...mapState('classSummary', ['learnerMap']),
      syncStatusOptions() {
        let options = [];
        for (const [value] of Object.entries(SyncStatus)) {
          options.push(value);
        }
        return options;
      },
    },
    mounted() {
      this.isPolling = true;
      this.pollClassListSyncStatuses({ classroom_id: this.$route.params.classId });
    },
    beforeDestroy() {
      this.isPolling = false;
    },
    methods: {
      ...mapActions(['fetchClassListSyncStatuses']),
      mapLastSynctedTimeToLearner(learnerId) {
        let learnerSyncData;
        if (this.classSyncStatusObject) {
          learnerSyncData = this.classSyncStatusObject.filter(learnerStatusObject => {
            learnerStatusObject.user === learnerId;
          });
        }
        if (learnerSyncData) {
          if (learnerSyncData.last_active_sync) {
            const currentDateTime = new Date();
            const TimeDifference = learnerSyncData.last_active_sync - currentDateTime;
            const diffMins = Math.round(((TimeDifference % 86400000) % 3600000) / 60000);
            return diffMins;
          }
        }
        return '--';
      },
      mapSyncStatusOptionToLearner(learnerId) {
        let learnerSyncData;
        if (this.classSyncStatusObject) {
          learnerSyncData = this.classSyncStatusObject.filter(learnerStatusObject => {
            learnerStatusObject.user === learnerId;
          });
        }
        if (learnerSyncData) {
          if (learnerSyncData.active) {
            return 'SYNCING';
          } else if (learnerSyncData.queued) {
            return 'QUEUED';
          } else if (learnerSyncData.last_activity_timestamp) {
            const currentDateTime = new Date();
            const TimeDifference = learnerSyncData.last_activity_timestamp - currentDateTime;
            const diffMins = Math.round(((TimeDifference % 86400000) % 3600000) / 60000);
            if (diffMins < 60) {
              return 'RECENTLY_SYNCED';
            } else {
              return 'NOT_RECENTLY_SYNCED';
            }
          }
        }
        return 'NOT_CONNECTED';
      },
      pollClassListSyncStatuses() {
        this.fetchClassListSyncStatuses({ classroom_id: this.$route.params.classId }).then(
          status => {
            this.classSyncStatusObject = status;
          }
        );
        if (this.isPolling) {
          setTimeout(() => {
            this.pollClassListSyncStatuses();
          }, 10000);
        }
      },
    },
    $trs: {
      pageHeader: "Learners in '{className}'",
      deviceStatus: 'Device status',
      lastSyncedStatus: 'Last synced',
      howToTroubleshootModalHeader: 'How to troubleshoot learner devices',
      howToTroubleshootModalSubheader: 'Here are the different device statuses and their meanings',
      close: 'Close',
    },
  };

</script>


<style lang="scss" scoped>

  .troubleshooting-modal-link {
    margin-bottom: 40px;
  }

  // #modal-title {
  //   padding-bottom: 4px;
  //   font-size: 18px;
  // }

  /deep/ .content {
    font-size: 14px;
  }

</style>
