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


        <KGridItem :layout8="{ span: 4 }" :layout12="{ span: 6 }" class="separate">
          <b>{{ facility.name }}</b>
        </KGridItem>
        <KGridItem
          :layout="{ alignment: 'right' }"
          :layout8="{ span: 4 }"
          :layout12="{ span: 6 }"
          class="separate"
        >
          <KButton
            @click="deviceModal = true"
          >
            {{ $tr('addDevice') }}
          </KButton>
        </KGridItem>



      </KGrid>

      <!--      creating the table-->

      <CoreTable>
        <template #tbody>
          <tbody>
            <tr>
              <th>{{ $tr('deviceName') }}</th>
              <th>{{ $tr('Schedule') }}</th>
              <th>{{ $tr('Status') }}</th>
              <th></th>
            </tr>

            <tr v-for="device in data" :key="device.id">
              <td>
                <span>{{ device.device_name }}<br>
                  {{ device.base_url }}
                </span>
              </td>

              <td>Never</td>

              <td v-if="device.available">
                <KIcon
                  icon="onDevice"
                />
                <span>{{ $tr('connected') }}</span>
              </td>
              <td v-else>
                <KIcon
                  icon="disconnected"
                />
                <span>{{ $tr('disconnected') }}</span>
              </td>
              <td>
                <KButton
                  class="right"
                  @click="editButton(device.id,device.device_name,device.available)"
                >
                  {{ $tr('editBtn') }}
                </KButton>
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

            <div v-for="btn in data" :key="btn.id">
              <div>
                <KRadioButton
                  v-model="radioBtnValue"
                  class="radio-button"
                  :value="btn.id"
                  :label="btn.device_name"
                />
                <span>{{ btn.base_url }}</span>
              </div>

            </div>


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
  import { TaskResource, FacilityResource, NetworkLocationResource } from 'kolibri.resources';
  import { PageNames } from '../../../constants';

  export default {
    name: 'ManageSyncSchedule',
    components: {
      ImmersivePage,
      CoreTable,
    },
    extends: ImmersivePage,
    data() {
      return { deviceModal: false, facility: null, data: null, radioBtnValue: ' ' };
    },
    computed: {
      goBack() {
        return { name: PageNames.DATA_EXPORT_PAGE };
      },
    },
    beforeMount() {
      // console.log(this.$store.core.Facility);
      this.fetchFacility();
      this.fetchAddressesForLOD();
    },

    methods: {
      fetchFacility() {
        FacilityResource.fetchModel({ id: this.$store.getters.activeFacilityId, force: true }).then(
          facility => {
            this.facility = { ...facility };
          }
        );
      },
      fetchAddressesForLOD(LocationResource = NetworkLocationResource) {
        return LocationResource.fetchCollection({ force: true }).then(locations => {
          this.data = locations;
        });
      },
      pollFacilityTasks() {
        TaskResource.list({ queue: 'facility_task' }).then(tasks => {
          this.myFacility = tasks;
          console.log(this.myFacility);
          if (this.isPolling) {
            setTimeout(() => {
              console.log(this.pollFacilityTasks);
              return this.pollFacilityTasks();
            }, 2000);
          }
        });
      },
      closeModal() {
        this.deviceModal = false;
      },
      submitModal() {
        this.deviceModal = false;
        this.$router.push({ path: '/editdevice/' });
      },
      newAddress() {
        this.$router.push('/newAddress');
      },
      editButton(value) {
        this.$router.push({
          path: '/editdevice/?id=' + value,
        });
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
      connected: {
        message: 'Connected',
        context: 'Connected device',
      },
      disconnected: {
        message: 'Disconnected',
        context: 'Disconnected device',
      },
    },
  };

</script>


<style scoped>
.separate{
  margin-bottom:35px;
  margin-top:35px;
}
.right {
  position: absolute;
  right: 50px;
}
</style>
