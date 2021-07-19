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
        <div v-for="status in syncStatusOptions" :key="status.id" class="status-option-display">
          <SyncStatusDisplay :syncStatus="status" displaySize="sync-status-large-bold" />
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
                  {{ $tr('lastSyncedTime', { time: mapLastSynctedTimeToLearner(learner.id) }) }}
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
        classSyncStatusList: [],
      };
    },
    computed: {
      ...mapState('classSummary', ['learnerMap']),
      syncStatusOptions() {
        let options = [];
        for (const [value] of Object.entries(SyncStatus)) {
          // skip displaying the "not recently synced" as a separate option, per Figma design
          value !== SyncStatus.NOT_RECENTLY_SYNCED ? options.push(value) : null;
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
      ...mapActions(['fetchUserSyncStatus']),
      mapLastSynctedTimeToLearner(learnerId) {
        let learnerSyncData;
        if (this.classSyncStatusList) {
          learnerSyncData = this.classSyncStatusList.filter(entry => {
            entry.user_id == learnerId;
          });
        }
        if (learnerSyncData) {
          learnerSyncData.last_synced = new Date(new Date().valueOf() - 1000);
          if (learnerSyncData.last_synced) {
            const currentDateTime = new Date();
            const timeDifference = (currentDateTime - learnerSyncData.last_synced) / 1000;
            if (timeDifference <= 60) {
              const diffMins = Math.round(timeDifference / 60).toString();
              return diffMins.toString();
            }
          }
          return '--';
        }
        return '--';
      },
      mapSyncStatusOptionToLearner(learnerId) {
        let learnerSyncData;
        if (this.classSyncStatusList) {
          learnerSyncData = this.classSyncStatusList.filter(entry => {
            return entry.user_id == learnerId;
          });
          learnerSyncData = learnerSyncData[learnerSyncData.length - 1];
        }
        if (learnerSyncData) {
          if (learnerSyncData.active) {
            return SyncStatus.SYNCINGSYNCING;
          } else if (learnerSyncData.queued) {
            return SyncStatus.QUEUED;
          } else if (learnerSyncData.last_synced) {
            const currentDateTime = new Date();
            const TimeDifference = learnerSyncData.last_synced - currentDateTime;
            const diffMins = Math.round(((TimeDifference % 86400000) % 3600000) / 60000);
            if (diffMins < 60) {
              return SyncStatus.RECENTLY_SYNCED;
            } else {
              return SyncStatus.NOT_RECENTLY_SYNCED;
            }
          }
        }
        return SyncStatus.NOT_CONNECTED;
      },
      pollClassListSyncStatuses() {
        this.fetchUserSyncStatus({ id: this.$route.params.classId }).then(status => {
          this.classSyncStatusList = status;
        });
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
      lastSyncedTime: 'Last synced {time} minutes ago',
      howToTroubleshootModalHeader: 'Information about sync statuses',
      close: 'Close',
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
