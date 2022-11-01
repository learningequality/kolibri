<template>

  <ImmersivePage
    :appBarTitle="$tr('toolbarHeader')"
    :route="backRoute"
  >
    <KPageContainer>
      <KGrid gutter="48">
        <KGridItem>
          <h1>{{ $tr('editSyncScheduleSubTitle') }}</h1>
        </KGridItem>
        <KGridItem>
          <p>{{ $tr('deviceName') }}</p><br>
        </KGridItem>

        <KGridItem
          :layout8="{ span: 3 }"
          :layout12="{ span: 4 }"
        >
          <KSelect
            value="Devices"
            :options="['LINUX','WINODWS','MACOS','ANDROID','IOS']"
          />
        </KGridItem>

        <KGridItem>
          <p>{{ $tr('serverTime') }} </p>
        </KGridItem>

        <KGridItem>
          <KCheckbox>
            {{ $tr('checboxlabel') }}
          </KCheckbox>
        </KGridItem>
        <KGridItem>
          <KButton
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
        />
        <KButton
          :text="$tr('saveBtn')"
          primary="raised-button"
        />
      </KButtonGroup>
    </BottomAppBar>

    <KModal
      v-if="removeDeviceModal"
      :title="$tr('removeDevice')"
      size="medium"
      submitText="REMOVE"
      cancelText="CANCEL"
      @cancel="closeModal"
      @submit="ConfirmRemoveDevice"
    >
      <KGrid>
        <KGridItem
          :layout8="{ span: 4 }"
          :layout12="{ span: 6 }"
        >
          <p>{{ $tr('deviceName') }}</p>
        </KGridItem>

        <KGridItem
          :layout8="{ span: 8 }"
          :layout12="{ span: 12 }"
        >
          <p>{{ $tr('removeDeviceWarning') }}</p>
          <p>{{ $tr('deviceNotConnected') }}</p>
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
    name: 'EditSyncSchedule',
    components: {
      ImmersivePage,
      BottomAppBar,
    },
    data() {
      return { removeDeviceModal: false };
    },
    computed: {
      backRoute() {
        return { name: PageNames.MANAGE_SYNC };
      },
      msg() {
        return this.$tr('removeDevice');
      },
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
    },
    $trs: {
      toolbarHeader: {
        message: 'Edit sync schedule',
        context: 'Heading for edit schedule page.',
      },
      editSyncScheduleSubTitle: {
        message: 'Edit sync schedule',
        context: 'Subtitle for the edit sync schedule page',
      },
      deviceName: {
        message: 'LINUX 5 (9C24)',
        context: 'Edit device name',
      },
      serverTime: {
        message: 'Server time: Mon Jan 27 2020 15:52:05 GMT-0800 (Pacific Standard Time)',
        context: 'Server time label',
      },
      checboxlabel: {
        message:
          'If scheduled sync fails, retry until the next scheduled syncIf scheduled sync fails, retry until the next scheduled sync',
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
    },
  };

</script>
