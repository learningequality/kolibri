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
          <p>{{ device.device_name }}</p>
        </KGridItem>

        <KGrid class="align-kselects">
          <KGrid>
            <KGridItem>
              <KSelect
                v-model="selectedItem"
                class="selector"
                :disabled="currentTaskRunning"
                :style="selectorStyle"
                :options="selectArray"
                :label="$tr('frequency')"
              />
            </KGridItem>
          </KGrid>
          <KGrid v-if="dayRequired">
            <KGridItem>
              <KSelect
                v-model="selectedDay"
                class="selector"
                :disabled="currentTaskRunning"
                :style="selectorStyle"
                :options="getDays"
                :label="$tr('day')"
              />
            </KGridItem>
          </KGrid>
          <KGrid v-if="timeRequired">
            <KGridItem>
              <KSelect
                v-model="selectedTime"
                class="selector"
                :disabled="currentTaskRunning"
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
            {{
              $formatTime(now, {
                year: 'numeric',
                month: 'numeric',
                day: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                second: 'numeric',
              })
            }}
          </p>

          <p class="spacing">
            <KCheckbox
              :checked="retryFlag"
              :disabled="currentTaskRunning"
              @change="retryFlag = !retryFlag"
            >
              {{ $tr('checkboxLabel') }}
            </KCheckbox>
          </p>
          <p>
            <KButton
              v-if="currentTask"
              :disabled="currentTaskRunning"
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
          @click="goBack"
        />
        <KButton
          :text="coreString('saveAction')"
          :primary="true"
          :disabled="saveDisabled"
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
          <p v-if="!device.available">
            {{ $tr('deviceNotConnected') }}
          </p>
        </KGridItem>
      </KGrid>
    </KModal>
  </ImmersivePage>

</template>


<script>

  import ImmersivePage from 'kolibri/components/pages/ImmersivePage';
  import BottomAppBar from 'kolibri/components/BottomAppBar';
  import { NetworkLocationResource } from 'kolibri-common/apiResources/NetworkLocationResource';
  import TaskResource from 'kolibri/apiResources/TaskResource';
  import { now } from 'kolibri/utils/serverClock';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { TaskStatuses, TaskTypes } from 'kolibri-common/utils/syncTaskUtils';
  import { KDP_ID, oneHour, oneDay, oneWeek, twoWeeks, oneMonth } from './constants';
  import { kdpNameTranslator } from './i18n';

  const today = new Date();
  const daysOfWeek = [];
  const date = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + (7 - today.getDay()),
  );
  for (let i = 0; i < 7; i++) {
    daysOfWeek.push({ value: i, date: new Date(date) });
    date.setDate(date.getDate() + 1);
  }

  const endTime = new Date();
  endTime.setHours(24, 0, 0, 0);
  const interval = 30;

  const times = [];
  var i = 0;
  const time = new Date();
  time.setHours(0, 0, 0, 0);

  while (time < endTime) {
    times.push({ value: i++, time: new Date(time) });
    time.setMinutes(time.getMinutes() + interval);
  }

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
        retryFlag: false,
        device: null,
        now: null,
        selectedItem: {},
        tasks: [],
        selectedDay: {},
        selectedTime: {},
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
          borderRadius: '5px 5px 0px 0px',
          paddingTop: '5px',
          paddingLeft: '5px',
          width: '300px',
          marginLeft: '16px',
        };
      },
      selectArray() {
        return [
          { label: this.$tr('everyHour'), value: oneHour },
          { label: this.$tr('everyDay'), value: oneDay },
          { label: this.$tr('everyWeek'), value: oneWeek },
          { label: this.$tr('everyTwoWeeks'), value: twoWeeks },
          { label: this.$tr('everyMonth'), value: oneMonth },
        ];
      },
      getDays() {
        return daysOfWeek.map(day => {
          return {
            label: this.$formatDate(day.date, { weekday: 'long' }),
            value: day.value,
          };
        });
      },

      SyncTime() {
        return times.map(time => {
          return {
            label: this.$formatTime(time.time),
            value: time.value,
            hours: time.time.getHours(),
            minutes: time.time.getMinutes(),
          };
        });
      },
      deviceName() {
        return this.device && this.device.nickname && this.device.nickname.length
          ? this.device.nickname
          : this.device.device_name;
      },
      currentTask() {
        return this.tasks && this.tasks.length ? this.tasks[0] : null;
      },
      currentTaskRunning() {
        return this.currentTask && this.currentTask.status === TaskStatuses.RUNNING;
      },
      timeRequired() {
        return this.selectedItem.value > oneHour;
      },
      timeIsSet() {
        return this.selectedTime && times[this.selectedTime.value];
      },
      dayRequired() {
        return this.selectedItem.value > oneDay;
      },
      dayIsSet() {
        return this.selectedDay && daysOfWeek[this.selectedDay.value];
      },
      isKdp() {
        return this.deviceId === KDP_ID;
      },
      taskType() {
        return this.isKdp ? TaskTypes.SYNCDATAPORTAL : TaskTypes.SYNCPEERFULL;
      },
      saveDisabled() {
        return (
          this.currentTaskRunning ||
          (!this.timeIsSet && this.timeRequired) ||
          (!this.dayIsSet && this.dayRequired) ||
          !this.selectedItem.value
        );
      },
    },
    created() {
      this.fetchDevice();
      this.now = now();
      this.serverTimeInterval = setInterval(() => {
        this.now = now();
      }, 10000);
    },
    beforeDestroy() {
      clearInterval(this.serverTimeInterval);
    },
    methods: {
      closeModal() {
        this.removeDeviceModal = false;
      },
      handleDeleteDevice() {
        this.removeDeviceModal = false;
        TaskResource.deleteModel({ id: this.currentTask.id })
          .then(() => {
            this.showSnackbarNotification('deviceRemove');
            this.goBack();
          })
          .catch(() => {
            this.showSnackbarNotification('deviceNotRemove');
          });
      },
      computeNextSync() {
        const date = new Date(this.now);
        if (this.timeRequired) {
          if (!this.timeIsSet) {
            throw new ReferenceError('Time is not set and is required');
          }
          const hours = this.selectedTime.hours;
          const minutes = this.selectedTime.minutes;
          if (
            hours < date.getHours() ||
            (hours === date.getHours() && minutes < date.getMinutes())
          ) {
            date.setDate(date.getDate() + 1);
          }
          date.setHours(hours);
          date.setMinutes(minutes);
        }
        if (this.dayRequired) {
          if (!this.dayIsSet) {
            throw new ReferenceError('Day is not set and is required');
          }
          const diff = this.selectedDay.value - date.getDay();
          if (date.getDay() > this.selectedDay.value) {
            date.setDate(date.getDate() + 7 - Math.abs(diff));
          } else if (date.getDay() < this.selectedDay.value) {
            date.setDate(date.getDate() + Math.abs(diff));
          }
        }
        return date;
      },
      handleSaveSchedule() {
        const enqueue_param = this.computeNextSync().toISOString();
        const enqueue_args = {
          enqueue_at: enqueue_param,
          repeat_interval: this.selectedItem.value,
          repeat: null,
          retry_interval: this.retryFlag ? 60 * 5 : null,
        };
        let promise;
        if (this.currentTask) {
          promise = TaskResource.saveModel({
            id: this.currentTask.id,
            data: { enqueue_args },
            exists: true,
          });
        } else {
          const taskParams = {
            type: this.taskType,
            facility: this.facilityId,
            enqueue_args,
          };
          if (!this.isKdp) {
            taskParams.device_id = this.deviceId;
            taskParams.baseurl = this.device.base_url;
          }
          promise = TaskResource.startTask(taskParams);
        }
        promise
          .then(() => {
            this.goBack();
            this.showSnackbarNotification('syncAdded');
          })
          .catch(() => {
            this.createTaskFailedSnackbar();
            if (this.currentTask) {
              this.fetchSyncTasks();
            }
          });
      },

      goBack() {
        this.$router.push(this.goBackRoute);
      },
      pollFetchSyncTasks() {
        this.pollInterval = setInterval(() => {
          this.fetchSyncTasks();
        }, 10000);
      },
      fetchSyncTasks() {
        TaskResource.list({ queue: 'facility_task' }).then(tasks => {
          this.tasks = tasks.filter(
            task =>
              (this.isKdp || task.extra_metadata.device_id === this.device.id) &&
              task.facility_id === this.facilityId &&
              task.type === this.taskType &&
              // Only show tasks that are repeating indefinitely
              task.repeat === null,
          );
          this.$nextTick(() => {
            if (this.currentTask) {
              const enqueueAt = new Date(Date.parse(this.currentTask.scheduled_datetime));
              const day = enqueueAt.getDay();
              const hours = enqueueAt.getHours();
              const minutes = enqueueAt.getMinutes();
              this.selectedItem =
                this.selectArray.find(item => item.value === this.currentTask.repeat_interval) ||
                {};
              this.selectedDay = this.getDays.find(item => item.value === day) || {};
              for (const time of this.SyncTime) {
                // Because there can be some drift in the task scheduling process,
                // we round the 'scheduled' time to the nearest 30 minutes
                if (
                  time.minutes === 0 &&
                  ((time.hours === hours && minutes < 15) ||
                    (time.hours === hours + 1 && minutes >= 45))
                ) {
                  this.selectedTime = time;
                  break;
                }
                if (time.minutes === 30 && time.hours === hours && minutes >= 15 && minutes < 45) {
                  this.selectedTime = time;
                  break;
                }
              }
              this.retryFlag = Boolean(this.currentTask.retry_interval);
              if (this.currentTaskRunning) {
                this.pollFetchSyncTasks();
              } else {
                clearInterval(this.pollInterval);
                this.pollInterval = null;
              }
            }
          });
        });
      },
      fetchDevice() {
        if (this.isKdp) {
          this.device = {
            id: KDP_ID,
            // eslint-disable-next-line kolibri/vue-no-undefined-string-uses
            device_name: kdpNameTranslator.$tr('syncToKDP'),
            base_url: '',
          };
          this.fetchSyncTasks();
          return;
        }
        NetworkLocationResource.fetchModel({ id: this.deviceId }).then(device => {
          this.device = device;
          this.fetchSyncTasks();
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
        message: 'Frequency',
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
