<template>

  <ImmersivePage
    :appBarTitle="$tr('editSyncScheduleTitle')"
    :route="goBackRoute"
    :icon="icon"
  >
    <KPageContainer
      v-if="device"
      :style="pageHeight"
    >
      <KGrid
        gutter="48"
        class="edit-sync-schedule"
      >

        <KGridItem>
          <h1>{{ $tr('editSyncScheduleTitle') }}</h1>
        </KGridItem>

        <KGridItem>
          <p>{{ device.device_name }} </p>
        </KGridItem>

        <KGrid class="align-kselects">
          <KGrid>
            <KGridItem>
              <KSelect
                v-model="selectedItem"
                class="selector"
                :style="selectorStyle"
                :options="selectArray"
                :label="$tr('frequency')"
              />
            </KGridItem>

          </KGrid>
          <KGrid
            v-if="selectedItem.value !== 3600
              && selectedItem.value !== 86400"
            class=""
          >
            <KGridItem>
              <KSelect
                v-model="selectedDay"
                class="selector"
                :style="selectorStyle"
                :options="getDays"
                :label="$tr('day')"
              />

            </KGridItem>

          </KGrid>
          <KGrid
            v-if="selectedItem.value !== 3600"
            class=""
          >
            <KGridItem>
              <KSelect
                v-model="selectedTime"
                class="selector"
                :style="selectorStyle"
                :options="SyncTime"
                :label="$tr('time')"
              />
            </KGridItem>
          </KGrid>

        </KGrid>
        <KGridItem>

          <p class="spacing">
            {{ $tr('serverTime') }}
            {{ now }}
          </p>

          <p class="spacing">
            <KCheckbox>
              {{ $tr('checkboxLabel') }}
            </KCheckbox>
          </p>
          <p>
            <KButton
              appearance="basic-link"
              class="spacing"
              @click="removeDeviceModal = true"
            >
              {{ $tr('removeDeviceLabel') }}
            </KButton>

          </p>

        </KGridItem>

      </KGrid>

    </KPageContainer>

    <BottomAppBar>
      <KButtonGroup>
        <KButton
          :text="coreString('cancelAction')"
          appearance="flat-button"
          @click="cancelBtn"
        />
        <KButton
          :text="coreString('saveAction')"
          :primary="true"
          @click="handleSaveSchedule"
        />
      </KButtonGroup>
    </BottomAppBar>

    <KModal
      v-if="removeDeviceModal"
      :title="$tr('removeDevice')"
      size="medium"
      :submitText="coreString('removeAction')"
      :cancelText="coreString('cancelAction')"
      @cancel="closeModal"
      @submit="handleDeleteDevice"
    >
      <KGrid>
        <KGridItem
          :layout8="{ span: 6 }"
          :layout12="{ span: 10 }"
        >
          <p>{{ deviceName }}</p>
        </KGridItem>

        <KGridItem
          :layout8="{ span: 8 }"
          :layout12="{ span: 12 }"
        >
          <p>{{ $tr('removeDeviceWarning') }}</p>
          <p v-if="device.available">

          </p>
          <p v-else>
            {{ $tr('deviceNotConnected') }}
          </p>
        </KGridItem>
      </KGrid>
    </KModal>
  </ImmersivePage>

</template>


<script>

  import ImmersivePage from 'kolibri.coreVue.components.ImmersivePage';
  import BottomAppBar from 'kolibri.coreVue.components.BottomAppBar';
  import { NetworkLocationResource, FacilityResource, TaskResource } from 'kolibri.resources';
  import { now } from 'kolibri.utils.serverClock';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { TaskTypes } from 'kolibri.utils.syncTaskUtils';

  export default {
    name: 'EditDeviceSyncSchedule',
    components: {
      ImmersivePage,
      BottomAppBar,
    },
    mixins: [commonCoreStrings],
    props: {
      icon: {
        type: String,
        default: 'back',
      },
      facilityId: {
        type: String,
        required: true,
      },
      deviceId: {
        type: String,
        required: true,
      },
      goBackRoute: {
        type: Object,
        required: true,
      },
    },
    data() {
      return {
        removeDeviceModal: false,
        deviceName: null,
        device: [],
        now: now(),
        selectedItem: {},
        tasks: [],
        selectedDay: {},
        selectedTime: {},
        removeBtn: false,
        serverTime: null,
        baseurl: null,
      };
    },
    computed: {
      pageHeight() {
        return {
          height: '80%',
          zIndex: -1,
        };
      },
      selectorStyle() {
        return {
          color: this.$themeTokens.text,
          backgroundColor: this.$themePalette.grey.v_200,
          borderRadius: '5px 5px 0px 0px',
          paddingTop: '5px',
          paddingLeft: '5px',
          width: '300px',
          marginLeft: '16px',
        };
      },
      selectArray() {
        return [
          { label: this.$tr('everyHour'), value: 3600 },
          { label: this.$tr('everyDay'), value: 86400 },
          { label: this.$tr('everyWeek'), value: 604800 },
          { label: this.$tr('everyTwoWeeks'), value: 1209600 },
          { label: this.$tr('everyMonth'), value: 2592000 },
        ];
      },
      getDays() {
        const today = new Date();
        const daysOfWeek = [];
        const date = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() + (7 - today.getDay())
        );
        for (let i = 0; i < 7; i++) {
          daysOfWeek.push({ label: this.$formatDate(date, { weekday: 'long' }), value: i });
          date.setDate(date.getDate() + 1);
        }
        return daysOfWeek;
      },

      SyncTime() {
        const endTime = new Date();
        endTime.setHours(24, 0, 0, 0);
        const interval = 30;

        const times = [];
        var i = 0;
        const time = new Date();
        time.setHours(0, 0, 0, 0);

        while (time < endTime) {
          times.push({ label: this.$formatTime(time), value: i++ });
          time.setMinutes(time.getMinutes() + interval);
        }
        return times;
      },
    },
    beforeMount() {
      this.fetchDevice();
    },
    mounted() {
      this.serverTime = setInterval(() => {
        this.now = now();
      }, 10000);
    },
    beforeDestroy() {
      clearInterval(this.serverTime);
    },
    methods: {
      closeModal() {
        this.removeDeviceModal = false;
      },
      handleDeleteDevice() {
        this.removeDeviceModal = false;
        NetworkLocationResource.deleteModel({ id: this.deviceId })
          .then(() => {
            this.showSnackbarNotification('deviceRemove');
            history.back();
          })
          .catch(() => {
            this.showSnackbarNotification('deviceNotRemove');
          });
      },
      handleSaveSchedule() {
        FacilityResource.fetchModel({ id: this.facilityId, force: true }).then(facility => {
          this.facility = { ...facility };
          const date = new Date(this.serverTime);
          const equeue_param = date.toISOString();
          TaskResource.startTask({
            type: TaskTypes.SYNCPEERFULL,
            facility: this.facility.id,
            device_id: this.deviceId,
            baseurl: this.baseurl,
            enqueue_args: {
              enqueue_at: equeue_param,
              repeat_interval: this.selectedItem.value,
              repeat: 2,
            },
          })
            .then(() => {
              history.back();
              this.showSnackbarNotification('syncAdded');
            })
            .catch(() => {
              this.createTaskFailedSnackbar();
            });
        });
      },

      cancelBtn() {
        this.$router.push(this.goBackRoute);
      },
      fetchDevice() {
        NetworkLocationResource.fetchModel({ id: this.deviceId }).then(device => {
          this.device = device;
          this.baseurl = device.base_url;
          TaskResource.list({ queue: 'facility_task' }).then(tasks => {
            this.tasks = tasks.filter(
              task =>
                task.extra_metadata.device_id === device.id && task.facility_id === this.facilityId
            );
            if (this.tasks && this.tasks.length) {
              this.removeBtn = true;
            }
          });
        });
      },
    },
    $trs: {
      editSyncScheduleTitle: {
        message: 'Edit device sync schedule',
        context: 'Subtitle for the edit sync schedule page',
      },
      serverTime: {
        message: 'Server time:',
        context: 'Server time label',
      },
      checkboxLabel: {
        message: 'If scheduled sync fails, keep trying',
        context: 'Label for checkbox',
      },
      removeDevice: {
        message: 'Remove device',
        context: 'Title for the remove device modal',
      },
      removeDeviceWarning: {
        message: 'You are about to remove this device from the sync schedule.',
        context: 'Label to warn the user before removing the device',
      },
      deviceNotConnected: {
        message: 'This device is not currently connected to your network.',
        context: 'Message showing that the device is no longer on the network',
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
      removeDeviceLabel: {
        message: 'Remove device from sync schedule',
        context: 'Button label for removing the device from the sync schedule',
      },
      frequency: {
        message: 'Frequence',
        context: 'Indicates often the scheduled sync occurs',
      },
      day: {
        message: 'Day',
        context: 'Indicates the day of the week on which the scheduled sync occurs',
      },
      time: {
        message: 'Time',
        context: 'Indicates the time of day at which the scheduled sync occurs',
      },
    },
  };

</script>


<style scoped>
.spacing {
  margin-top: 10px;
}
.loader {
  margin-top: 5px;
}
.edit-sync-schedule {
  margin-left: 20px;
}
.align-kselects {
  margin-left: 16px;
}
</style>
