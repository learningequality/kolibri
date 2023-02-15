<template>

  <ImmersivePage
    :appBarTitle="$tr('toolbarHeader')"
    :route="backRoute"
    :icon="icon"
  >
    <KPageContainer v-if="device">
      <KGrid gutter="48">

        <KGridItem>
          <h1>{{ $tr('editSyncScheduleSubTitle') }}</h1>
        </KGridItem>

        <KGridItem>
          <p>{{ device.device_name }} </p><br>
        </KGridItem>

        <KGridItem
          :layout8="{ span: 8 }"
          :layout12="{ span: 12 }"
        >

          <KGridItem
            :layout8="{ span: 2 }"
            :layout12="{ span: 3 }"
          >
            <KSelect
              v-model="selectedItem"
              :value="myvalue"
              class="selector"
              :style="selectorStyle"
              :options="selectArray"
              label="Repeat"
            />

          </KGridItem>

          <KGridItem
            v-if="selectedItem.label !== 'Never'
              && selectedItem.label !== 'Every hour'
              && selectedItem.label !== 'Every day'"
            :layout8="{ span: 2 }"
            :layout12="{ span: 3 }"
          >
            <KSelect
              v-model="dayselected"
              class="selector"
              :style="selectorStyle"
              :options="Days"
              label="On"
            />

          </KGridItem>

          <KGridItem
            v-if="selectedItem.label !== 'Never' && selectedItem.label !== 'Every hour' "
            :layout8="{ span: 2 }"
            :layout12="{ span: 3 }"
          >


            <KSelect
              v-model="timeseed"
              :value="mytime"
              class="selector"
              :style="selectorStyle"
              :options="SyncTime"
              label="At"
            />
          </KGridItem>

          <KGridItem>
            <span>
              {{ $tr('serverTime') }}
              {{ serverTime }}
            </span>
          </KGridItem>

          <KGridItem>
            <KCheckbox>
              {{ $tr('checboxlabel') }}
            </KCheckbox>
          </KGridItem>
          <KGridItem>
            <KButton
              :vIf="msg"
              appearance="basic-link"
              @click="removeDevice"
            >
              {{ msg }}
            </KButton>
          </KGridItem>
        </KGridItem>
      </KGrid>

    </KPageContainer>

    <BottomAppBar>
      <KButtonGroup>
        <KButton
          :text="$tr('cancelBtn')"
          appearance="flat-button"
          @click="cancelBtn"
        />
        <KButton
          :text="$tr('saveBtn')"
          :primary="true"
          @click=" handleSaveSchedule"
        />
      </KButtonGroup>
    </BottomAppBar>


    <KModal
      v-if="removeDeviceModal"
      :title="$tr('removeDevice')"
      size="medium"
      :submitText="$tr('removeText')"
      :cancelText="$tr('cancelText')"
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
  import { PageNames } from '../../../../kolibri/plugins/facility/assets/src/constants';

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
      msg: {
        type: String,
        default: '',
      },
    },
    data() {
      return {
        removeDeviceModal: false,
        deviceName: null,
        available: null,
        device: null,
        now: now(),
        timer: null,
        myvalue: null,
        myday: null,
        mytime: null,
        selectedItem: '',
      };
    },
    computed: {
      backRoute() {
        return { name: PageNames.ManageSyncSchedule };
      },
      selectorStyle() {
        return {
          color: this.$themeTokens.text,
          backgroundColor: this.$themePalette.grey.v_200,
          borderRadius: '5px 5px 0px 0px',
          paddingTop: '5px',
          paddingLeft: '5px',
        };
      },
      selectArray() {
        return {
          1: { label: 'Never', value: 3600 },
          2: { label: this.$tr('everyHour'), value: 3600 },
          3: { label: this.$tr('everyDay'), value: 86400 },
          4: { label: this.$tr('everyWeek'), value: 604800 },
          5: { label: this.$tr('everyTwoWeeks'), value: 604800 },
          6: { label: this.$tr('everyMonth'), value: 2592000 },
        };
      },
      Days() {
        return {
          0: { label: this.$tr('mon'), value: 3600 },
          1: { label: this.$tr('tue'), value: 86400 },
          2: { label: this.$tr('wed'), value: 604800 },
          3: { label: this.$tr('thur'), value: 604800 },
          4: { label: this.$tr('fri'), value: 2592000 },
          5: { label: this.$tr('sat'), value: 2595000 },
          6: { label: this.$tr('sun'), value: 2595000 },
        };
      },
      SyncTime() {
        return [
          { label: '1:30 AM', value: 3600 },
          { label: '2:00 AM', value: 86400 },
          { label: '2:30 AM', value: 604800 },
          { label: '3:00 AM', value: 604800 },
          { label: '3:30 AM', value: 2592000 },
          { label: '4:00 AM', value: 2592000 },
          { label: '4:30 AM', value: 2592000 },
        ];
      },
    },
    beforeMount() {
      this.deviceName = this.$route.query.name;
      this.available = this.$route.query.present;
      this.myvalue = this.selectArray[0];
      this.myday = this.Days[0];
      this.mytime = this.SyncTime[0];
      this.serverTime = this.now;
    },
    mounted() {
      this.timer = setInterval(() => {
        this.now = now();
      }, 10000);
    },
    beforeDestroy() {
      clearInterval(this.timer);
    },
    methods: {
      removeDevice() {
        this.removeDeviceModal = true;
      },
      closeModal() {
        this.removeDeviceModal = false;
      },
      handleDeleteDevice() {
        this.removeDeviceModal = false;
        NetworkLocationResource.deleteModel({ id: this.$route.query.id })
          .then(() => {
            this.showSnackbarNotification('deviceRemove');
            history.back();
          })
          .catch(() => {
            this.showSnackbarNotification('deviceNotRemove');
          });
      },
      handleSaveSchedule() {
        FacilityResource.fetchModel({ id: this.$store.getters.activeFacilityId, force: true }).then(
          facility => {
            this.facility = { ...facility };
            // console.log(this.facility);
            TaskResource.startTask({
              type: TaskTypes.SYNCPEERFULL,
              facility: this.facility.id,
              device_id: this.device.id,
              baseurl: this.baseurl,
              enqueue_args: { enqueue_at: this.serverTime, repeat_interval: 2, repeat: 2 },
            })
              .then(() => {
                // this.notifyAndWatchTask(tasks);
                history.back();
              })
              // const notifyAndWatchPromise = startTaskPromise.then(tasks => {

              // });
              // Promise.all([startTaskPromise, notifyAndWatchPromise])
              //   .then(() => {

              //   })
              .catch(() => {
                // this.createTaskFailedSnackbar();
              });
            this.showSnackbarNotification('syncAdded');
          }
        );
      },

      cancelBtn() {
        this.$router.push({ name: PageNames.ManageSyncSchedule });
      },
      // fetchFacility() {
      //   NetworkLocationResource.fetchModel({ id: this.$route.query.id }).then(device => {
      //     this.device = device;
      //   });
      // },
    },
    $trs: {
      toolbarHeader: {
        message: 'Edit device sync schedule',
        context: 'Heading for edit schedule page.',
      },
      editSyncScheduleSubTitle: {
        message: 'Edit device sync schedule',
        context: 'Subtitle for the edit sync schedule page',
      },
      serverTime: {
        message: 'Server time:',
        context: 'Server time label',
      },
      checboxlabel: {
        message: 'If scheduled sync fails, retry until the next scheduled sync',
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
      saveBtn: {
        message: 'Save',
        context: 'Save button on bottomAppBar',
      },
      cancelBtn: {
        message: 'Cancel',
        context: 'Cancel buttton on the bottomAppBar',
      },
      everyHour: {
        message: 'Every hour',
        context: 'Label for every hour',
      },
      everyDay: {
        message: 'Every day',
        context: 'Label for every day',
      },
      everyWeek: {
        message: 'Every week',
        context: 'Label for every week',
      },
      everyMonth: {
        message: 'Every month',
        context: 'Label for every month',
      },
      everyTwoWeeks: {
        message: 'Every two weeks',
        context: 'Label for every two weeks',
      },
      removeText: {
        message: 'Remove',
        context: 'Label for remove button on the remove device modal',
      },
      cancelText: {
        message: 'Cancel',
        context: 'Label for cancel button on the remove device modal',
      },
      mon: {
        message: 'Monday',
        context: 'Day 1',
      },
      tue: {
        message: 'Tuesday',
        context: 'Day 2',
      },
      wed: {
        message: 'Wednesday',
        context: 'Day 3',
      },
      thur: {
        message: 'Thrusday',
        context: 'Day 4',
      },
      fri: {
        message: 'Friday',
        context: 'Day 5',
      },
      sat: {
        message: 'Saturday',
        context: 'Day 6',
      },
      sun: {
        message: 'Sunday',
        context: 'Day 7',
      },
    },
  };

</script>
