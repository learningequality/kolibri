<template>

  <ImmersivePage
    :appBarTitle="$tr('toolbarHeader')"
    :route="goBack"
  >
    <KPageContainer>
      <KGrid gutter="48">
        <KGridItem>
          <h1>{{ $tr('manageSyncTitle') }}</h1>
        </KGridItem>

        <KGridItem>
          <p>{{ $tr('introduction') }}</p>
        </KGridItem>

        <KGridItem :layout8="{ span: 4 }" :layout12="{ span: 6 }">
          <p>{{ $tr('homeFacility') }}</p>
        </KGridItem>
        <KGridItem
          :layout="{ alignment: 'right' }"
          :layout8="{ span: 4 }"
          :layout12="{ span: 6 }"
        >
          <KButton
            @click="deviceModal = true"
          >
            {{ $tr('addDevice') }}
          </KButton>
        </KGridItem>
      </KGrid>

      <CoreTable>
        <template #tbody>
          <tbody class="table">
            <tr>
              <th>{{ $tr('deviceName') }}</th>
              <th>{{ $tr('Schedule') }}</th>
              <th>{{ $tr('Status') }}</th>
              <th></th>
            </tr>
            <tr>
              <td>
                <span>Kolibri Data Portal<br>
                  http://dataportal.link
                </span>
              </td>
              <td>Never</td>
              <td>
                <KIcon
                  icon="disconnected"
                />
                Not connected
              </td>
              <td>
                <KButton
                  @click="editButton"
                >
                  edit
                </KButton>
              </td>
            </tr>
            <tr>
              <td>
                <span>
                  MacOS<br>
                  localhost:8000
                </span>
              </td>
              <td>Every Monday at 14:30</td>
              <td>
                <KIcon
                  icon="onDevice"
                />
                Connected
              </td>
              <td>
                <KButton
                  :text="$tr('editBtn')"
                  @click="editButton"
                />
              </td>
            </tr>
          </tbody>
        </template>

      </CoreTable>
      <KModal
        v-if="deviceModal"
        :title="$tr('selectDevices')"
        size="medium"
        :submitText="$tr('continueText')"
        :cancelText="$tr('cancelText')"
        @cancel="closeModal"
        @submit="submitModal"
      >
        <KGrid>
          <KGridItem
            :layout8="{ span: 4 }"
            :layout12="{ span: 6 }"
          >
            <KButton
              appearance="basic-link"
              :text=" $tr('addAddress')"
              @click="newAddress"
            />
          </KGridItem>
        </KGrid>

        <KGrid gutter="48">
          <KGridItem
            :layout8="{ span: 4 }"
            :layout12="{ span: 6 }"
          >

            <KRadioButton
              v-model="deviceModal"
              label="LINUX"
              value="linux"
            >
              <span>localhost:8040</span>
            </KRadioButton>
          </KGridItem>

          <KGridItem
            :layout="{ alignment: 'right' }"
            :layout8="{ span: 4 }"
            :layout12="{ span: 6 }"
          >
            <KButton
              appearance="basic-link"
              :text="$tr('forgetText')"
            />
          </KGridItem>
        </KGrid>
      </KModal>
    </KPageContainer>
  </ImmersivePage>

</template>


<script>

  import ImmersivePage from 'kolibri.coreVue.components.ImmersivePage';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import { PageNames } from '../../../constants';

  export default {
    name: 'ManageSyncSchedule',
    components: {
      ImmersivePage,
      CoreTable,
    },
    extends: ImmersivePage,

    data() {
      return { deviceModal: false };
    },
    computed: {
      goBack() {
        return { name: PageNames.DATA_EXPORT_PAGE };
      },
    },
    methods: {
      closeModal() {
        this.deviceModal = false;
      },
      submitModal() {
        this.deviceModal = false;
        this.$router.push('/editsyncschedule');
      },
      newAddress() {
        this.$router.push('/newAddress');
      },
      editButton() {
        this.$router.push('/editdevice');
      },
    },

    $trs: {
      toolbarHeader: {
        message: 'Sync Schedules',
        context: "Heading for 'manage sync schedule' page.",
      },
      manageSyncTitle: {
        message: 'Sync Schedules',
        context: 'Title for the manage sync page',
      },
      introduction: {
        message:
          'Set a schedule for Kolibri to automatically try syncing with other Kolibri devices that share this facility. Devices must be connected to the same network at the scheduled sync time.',
        context: 'Introduction on the manage sync schedule',
      },
      homeFacility: {
        message: 'Home Facility Otodi Allan',
        context: 'My home facility',
      },
      addDevice: {
        message: 'Add device',
        context: 'Add device button',
      },
      deviceName: {
        message: 'Device name',
        context: 'Device name label',
      },
      Schedule: {
        message: 'Schedule',
        context: 'Schedule label',
      },
      Status: {
        message: 'Status',
        context: 'Status label',
      },
      selectDevices: {
        message: 'Select device',
        context: 'select devices label',
      },
      continueText: {
        message: 'continue',
        context: 'Continue button',
      },
      cancelText: {
        message: 'cancel',
        context: 'Cancel button',
      },
      addAddress: {
        message: 'Add address',
        context: 'Add address button',
      },
      forgetText: {
        message: 'Forget',
        context: 'Forget device button',
      },
      editBtn: {
        message: 'edit',
        context: 'Edit device button',
      },
    },
  };

</script>
