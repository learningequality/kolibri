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
              v-for="user in users"
              :key="user.id"
            >
              <td>
                <KLabeledIcon
                  icon="person"
                  :label="user.full_name"
                />
              </td>
              <td>
                <span dir="auto">
                  {{ user.username }}
                </span>
              </td>
              <td>
                <SyncStatusDisplay :syncStatus="user.sync_status" displaySize="sync-status-large" />
              </td>
              <td>
                <span dir="auto">
                  {{ user.lastSynced }}
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
        users: [
          {
            full_name: 'Full Name',
            username: 'username',
            sync_status: 'QUEUED',
            lastSynced: '1 hr',
          },
          {
            full_name: 'Full Name',
            username: 'username',
            sync_status: 'SYNCING',
            lastSynced: '1 hr',
          },
          {
            full_name: 'Full Name',
            username: 'username',
            sync_status: 'UNABLE_TO_SYNC',
            lastSynced: '1 hr',
          },
        ],
        displayTroubleshootModal: false,
      };
    },
    computed: {
      syncStatusOptions() {
        let options = [];
        for (const [value] of Object.entries(SyncStatus)) {
          options.push(value);
        }
        return options;
      },
      // syncStatusDescriptions() {
      //   let options = [];
      //   for (status in SyncStatus) {
      //     options.push(SyncStatus[status]);
      //   }
      //   let descriptions = options.map(option => {
      //     this.syncDescriptionDisplayMap(option);
      //   });
      //   return descriptions;
      // },
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
