<template>

  <ImmersivePage
    :appBarTitle="$tr('toolbarHeader')"
    :route="backRoute"
    :icon="icon"
  >
    <KPageContainer>
      <KGrid gutter="48">
        <KGridItem>
          <h1>{{ $tr('editSyncScheduleSubTitle') }}</h1>
        </KGridItem>
        <KGridItem>
          <p>{{ deviceName }}</p><br>
        </KGridItem>

        <KGridItem
          :layout8="{ span: 3 }"
          :layout12="{ span: 4 }"
        >
          <KSelect
            value="Devices"
            :options="selectArray"
          />
        </KGridItem>

        <KGridItem>
          <p>{{ $tr('serverTime') }} {{ currentTime }} </p>
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
          primary="true"
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
      @submit="ConfirmRemoveDevice"
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
          <p v-if="available === true">

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
  import { PageNames } from '../../../../constants';

  export default {
    name: 'EditDeviceSyncSchedule',
    components: {
      ImmersivePage,
      BottomAppBar,
    },
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
      return { removeDeviceModal: false, deviceName: null, available: null, currentTime: null };
    },
    computed: {
      backRoute() {
        return { name: PageNames.ManageSyncSchedule };
      },
      selectArray() {
        return [
          { label: this.$tr('every5Minutes'), value: 300 },
          { label: this.$tr('everyHour'), value: 3600 },
          { label: this.$tr('everyDay'), value: 86400 },
          { label: this.$tr('everyWeek'), value: 604800 },
          { label: this.$tr('everyTwoWeeks'), value: 604800 },
          { label: this.$tr('everyMonth'), value: 2592000 },
        ];
      },
    },
    beforeMount() {
      this.deviceName = this.$route.query.name;
      this.available = this.$route.query.present;
      this.currentTime = new Date();
      console.log(this.$route.query.id);
      console.log(this.$route.query.name);
    },
    methods: {
      removeDevice() {
        this.removeDeviceModal = true;
      },
      closeModal() {
        this.removeDeviceModal = false;
      },
      ConfirmRemoveDevice() {
        this.removeDeviceModal = false;
      },
      cancelBtn() {
        this.$router.push({ name: PageNames.ManageSyncSchedule });
      },
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
      every5Minutes: {
        message: 'Every 5 minutes',
        context: 'Label for every 5 minutes',
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
    },
  };

</script>
