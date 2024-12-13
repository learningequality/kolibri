<template>

  <ImmersivePage
    :appBarTitle="$tr('syncSchedules')"
    :route="goBackRoute"
  >
    <KPageContainer>
      <KGrid gutter="48">
        <KGridItem>
          <h1>{{ $tr('syncSchedules') }}</h1>
        </KGridItem>

        <KGridItem>
          <p>{{ $tr('introduction') }}</p>
        </KGridItem>

        <KGridItem
          :layout8="{ span: 4 }"
          :layout12="{ span: 6 }"
          class="separate"
        >
          <b v-if="facility">{{ facility.name }}</b>
          <KCircularLoader v-else />
        </KGridItem>
        <KGridItem
          :layout="{ alignment: 'right' }"
          :layout8="{ span: 4 }"
          :layout12="{ span: 6 }"
          class="separate"
        >
          <KButton @click="deviceModal = true">
            {{ $tr('addDevice') }}
          </KButton>
        </KGridItem>
      </KGrid>

      <!--      creating the table-->
      <CoreTable>
        <template #tbody>
          <tbody v-if="scheduledTasks.length > 0">
            <tr>
              <th>{{ coreString('deviceNameLabel') }}</th>
              <th>{{ $tr('Schedule') }}</th>
              <th>{{ coreString('statusLabel') }}</th>
              <th></th>
            </tr>
            <tr
              v-for="task in scheduledTasks"
              :key="task.id"
            >
              <td>
                <span>{{ task.deviceName }}<br >
                  {{ task.extra_metadata.baseurl }}
                </span>
              </td>
              <td>
                <div>
                  {{ scheduleTime(task.repeat_interval, task.scheduled_datetime) }}
                </div>
              </td>

              <td>
                <span v-if="task.deviceAvailable">
                  <KIcon icon="onDevice" />
                  <span>{{ $tr('connected') }}</span>
                </span>
                <span v-else-if="!task.isKDP">
                  <KIcon icon="disconnected" />
                  <span>{{ $tr('disconnected') }}</span>
                </span>
                <KEmptyPlaceholder v-else />
              </td>
              <td>
                <KButton
                  class="right"
                  @click="editButton(task)"
                >
                  {{ coreString('editAction') }}
                </KButton>
              </td>
            </tr>
          </tbody>

          <tbody v-else>
            <tr>
              <th>{{ coreString('deviceNameLabel') }}</th>
              <th>{{ $tr('Schedule') }}</th>
              <th>{{ coreString('statusLabel') }}</th>
              <th></th>
            </tr>
            <tr>
              <td
                colspan="3"
                style="text-align: center"
              >
                <b>{{ $tr('NoSync') }}</b>
              </td>
            </tr>
          </tbody>
        </template>
      </CoreTable>
      <SyncFacilityModalGroup
        v-if="deviceModal"
        :facilityForSync="facility"
        @close="closeModal"
        @syncKDP="handleKDPSync"
        @syncPeer="handlePeerSync"
      />
    </KPageContainer>
  </ImmersivePage>

</template>


<script>

  import { computed } from 'vue';
  import ImmersivePage from 'kolibri/components/pages/ImmersivePage';
  import CoreTable from 'kolibri/components/CoreTable';
  import TaskResource from 'kolibri/apiResources/TaskResource';
  import FacilityResource from 'kolibri-common/apiResources/FacilityResource';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import commonSyncElements from 'kolibri-common/mixins/commonSyncElements';
  import SyncFacilityModalGroup from 'kolibri-common/components/syncComponentSet/SyncFacilityModalGroup';
  import {
    useDeviceFacilityFilter,
    useDevicesWithFilter,
  } from 'kolibri-common/components/syncComponentSet/SelectDeviceModalGroup/useDevices';
  import { TaskTypes } from 'kolibri-common/utils/syncTaskUtils';
  import { KDP_ID, oneHour, oneDay, oneWeek, twoWeeks, oneMonth } from './constants';
  import { kdpNameTranslator } from './i18n';

  export default {
    name: 'ManageSyncSchedule',
    components: {
      ImmersivePage,
      CoreTable,
      SyncFacilityModalGroup,
    },
    extends: ImmersivePage,
    mixins: [commonCoreStrings, commonSyncElements],
    setup(props) {
      const deviceFilter = useDeviceFacilityFilter({ id: props.facilityId });
      const { devices } = useDevicesWithFilter(
        {
          subset_of_users_device: false,
        },
        deviceFilter,
      );
      const devicesById = computed(() => {
        return devices.value.reduce(
          (acc, device) => {
            acc[device.id] = device;
            return acc;
          },
          {
            [KDP_ID]: {
              device_id: KDP_ID,
              // eslint-disable-next-line kolibri/vue-no-undefined-string-uses
              device_name: kdpNameTranslator.$tr('syncToKDP'),
              base_url: '',
            },
          },
        );
      });
      return {
        devicesById,
      };
    },
    props: {
      facilityId: {
        type: String,
        required: true,
      },
      goBackRoute: {
        type: Object,
        required: true,
      },
      editSyncRoute: {
        type: Function,
        required: true,
      },
    },
    data() {
      return {
        deviceModal: false,
        facility: null,
        facilitySyncTasks: [],
      };
    },
    computed: {
      scheduledTasks() {
        return this.facilitySyncTasks.map(task => {
          const deviceName = this.devicesById[this.getDeviceId(task)]
            ? this.devicesById[this.getDeviceId(task)].device_name
            : task.extra_metadata.device_name;
          const deviceAvailable =
            this.devicesById[task.extra_metadata.device_id] &&
            this.devicesById[task.extra_metadata.device_id].available;
          const isKDP = task.type === TaskTypes.SYNCDATAPORTAL;
          return {
            ...task,
            deviceName,
            deviceAvailable,
            isKDP,
          };
        });
      },
    },
    beforeMount() {
      this.pollFacilityTasks();
      this.fetchFacility();
    },
    methods: {
      fetchFacility() {
        FacilityResource.fetchModel({ id: this.facilityId, force: true }).then(facility => {
          this.facility = { ...facility };
        });
      },
      pollFacilityTasks() {
        TaskResource.list({ queue: 'facility_task' }).then(tasks => {
          this.facilitySyncTasks = tasks.filter(
            t =>
              t.facility_id === this.facilityId &&
              t.repeat === null &&
              (t.type === TaskTypes.SYNCDATAPORTAL || t.type === TaskTypes.SYNCPEERFULL),
          );
          if (this.isPolling) {
            setTimeout(() => {
              return this.pollFacilityTasks();
            }, 2000);
          }
        });
      },
      closeModal() {
        this.deviceModal = false;
      },
      handlePeerSync(device) {
        this.deviceModal = false;
        if (device.id) {
          this.$router.push(this.editSyncRoute(device.id));
        }
      },
      handleKDPSync() {
        this.deviceModal = false;
        this.$router.push(this.editSyncRoute(KDP_ID));
      },
      editButton(task) {
        this.$router.push(this.editSyncRoute(this.getDeviceId(task)));
      },
      getDeviceId(task) {
        if (task.type === TaskTypes.SYNCPEERFULL) {
          return task.extra_metadata.device_id;
        } else if (task.type === TaskTypes.SYNCDATAPORTAL) {
          return KDP_ID;
        }
      },
      scheduleTime(time, timestamp) {
        timestamp = new Date(Date.parse(timestamp));
        if (time === oneHour) {
          return this.$tr('everyHour');
        }
        const options = {
          weekday: 'long',
          hour: 'numeric',
          minute: 'numeric',
        };
        let frequencyString;
        if (time === oneDay) {
          frequencyString = this.$tr('everyDay');
          delete options.weekday;
        }
        if (time === oneWeek) {
          frequencyString = this.$tr('everyWeek');
        }
        if (time === twoWeeks) {
          frequencyString = this.$tr('everyTwoWeeks');
        }
        if (time === oneMonth) {
          frequencyString = this.$tr('everyMonth');
        }
        return `${frequencyString}, ${this.$formatTime(timestamp, options)}`;
      },
    },

    $trs: {
      syncSchedules: {
        message: 'Sync schedules',
        context: "Heading or title for 'manage sync schedule' page.",
      },
      introduction: {
        message:
          'Set a schedule for Kolibri to automatically sync with other Kolibri devices sharing this facility. Devices with the same sync schedule will be synced one at a time.',
        context: 'Introduction on the manage sync schedule',
      },
      addDevice: {
        message: 'Add device',
        context: 'Add device button',
      },
      Schedule: {
        message: 'Schedule',
        context: 'Schedule label',
      },
      connected: {
        message: 'Connected',
        context: 'Connected device',
      },
      disconnected: {
        message: 'Not connected',
        context: 'Disconnected device',
      },
      NoSync: {
        message: 'There are no syncs scheduled',
        context: 'Text to display when there is no schedule sync to be managed.',
      },
      everyHour: {
        message: 'Every hour',
        context: 'Period for scheduling the sync between devices every hour',
      },
      everyDay: {
        message: 'Every day',
        context: 'Period for scheduling the sync between devices every day',
      },
      everyWeek: {
        message: 'Every week',
        context: 'Period for scheduling the sync between devices every week',
      },
      everyMonth: {
        message: 'Every month',
        context: 'Period for scheduling the sync between devices every month',
      },
      everyTwoWeeks: {
        message: 'Every two weeks',
        context: 'Period for scheduling the sync between devices every two weeks',
      },
    },
  };

</script>


<style scoped>

  .separate {
    margin-top: 35px;
    margin-bottom: 35px;
  }

  .add-space {
    margin: 4px;
  }

  .right {
    position: absolute;
    right: 50px;
  }

  .loader-size {
    margin-top: 10px;
  }

</style>
