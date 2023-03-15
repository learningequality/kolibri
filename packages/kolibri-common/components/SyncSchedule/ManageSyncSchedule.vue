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
          <b v-if="facility">{{ facility.name }}</b>
          <KCircularLoader v-else />
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
          <tbody v-if="savedDevices.length > 0">
            <tr>
              <th>{{ $tr('deviceName') }}</th>
              <th>{{ $tr('Schedule') }}</th>
              <th>{{ $tr('Status') }}</th>
              <th></th>
            </tr>
            <tr v-for="device in savedDevices" :key="device.id">
              <td>
                <span>{{ device.extra_metadata.device_name }}<br>
                  {{ device.extra_metadata.baseurl }}
                </span>
              </td>
              <td>
                <div>
                  {{ device.extra_metadata.sync_state }}
                </div>
              </td>

              <td v-if="data && data.length > 0">
                <div v-for="ids in data" :key="ids.id">
                  <div v-if="ids.base_url === device.extra_metadata.baseurl">
                    <span v-if="ids.available">
                      <KIcon
                        icon="onDevice"
                      />
                      <span>{{ $tr('connected') }}</span>
                    </span>
                    <span v-else>
                      <KIcon
                        icon="disconnected"
                      />
                      <span>{{ $tr('disconnected') }}</span>
                    </span>
                  </div>
                </div>
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
                  @click="editButton(device.id)"
                >
                  {{ $tr('editBtn') }}
                </KButton>
              </td>
            </tr>
          </tbody>

          <tbody v-else>
            <tr>
              <th>{{ $tr('deviceName') }}</th>
              <th>{{ $tr('Schedule') }}</th>
              <th>{{ $tr('Status') }}</th>
              <th></th>
            </tr>
            <tr>
              <td colspan="3" style="text-align:center">
                <b>{{ $tr('NoSync') }}</b>
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
        @submit="submitModal(radioBtnValue)"
      >
        <KGrid>
          <KGridItem
            :layout8="{ span: 4 }"
            :layout12="{ span: 6 }"
          >
            <KButton
              appearance="basic-link"
              :text=" $tr('addDevice')"
              @click.prevent="newAddress"
            />
          </KGridItem>
        </KGrid>

        <KGrid gutter="48" class="add-space">
          <KGridItem
            :layout8="{ span: 4 }"
            :layout12="{ span: 6 }"
          >
            <div v-if="data && data.length > 0">
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
            </div>
            <div v-else>
              <div class="loader-size">
                <KCircularLoader
                  :delay="false"
                  class="loader"
                  :size="18"
                />
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
      <AddDeviceForm v-if="newaddressclick" />
    </KPageContainer>
  </ImmersivePage>

</template>


<script>

  import ImmersivePage from 'kolibri.coreVue.components.ImmersivePage';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import { TaskResource, FacilityResource, NetworkLocationResource } from 'kolibri.resources';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { PageNames } from '../../../../kolibri/plugins/facility/assets/src/constants';
  import AddDeviceForm from '../../../../kolibri/core/assets/src/views/sync/SelectDeviceModalGroup/AddDeviceForm.vue';

  export default {
    name: 'ManageSyncSchedule',
    components: {
      ImmersivePage,
      CoreTable,
      AddDeviceForm,
    },
    extends: ImmersivePage,
    mixins: [commonCoreStrings],
    data() {
      return {
        deviceModal: false,
        facility: null,
        data: null,
        radioBtnValue: ' ',
        newaddressclick: false,
        deviceIds: [],
        savedDevices: [],
      };
    },
    computed: {
      goBack() {
        return { name: PageNames.DATA_EXPORT_PAGE };
      },
    },
    beforeMount() {
      this.pollFacilityTasks();
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
          console.log(this.data);
        });
      },
      pollFacilityTasks() {
        TaskResource.list({ queue: 'facility_task' }).then(tasks => {
          this.savedDevices = tasks;
          console.log(this.savedDevices);

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
      submitModal(id) {
        this.deviceModal = false;
        if (id !== ' ') {
          this.deviceIds.push(id);
          this.$router.push({ name: PageNames.EDIT_SYNC_SCHEDULE, params: { deviceId: id } });
        } else {
          return window.location.href;
        }
      },
      newAddress() {
        this.newaddressclick = true;
      },
      editButton(value) {
        if (value !== ' ') {
          this.$router.push({ name: PageNames.EDIT_SYNC_SCHEDULE, params: { deviceId: value } });
        } else {
          return window.location.href;
        }
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
        message: 'Not Connected',
        context: 'Disconnected device',
      },
      NoSync: {
        message: 'There are no syncs scheduled',
        context: 'Text to display when there is no schedule sync to be managed.',
      },
    },
  };

</script>


<style scoped>
.separate{
  margin-bottom:35px;
  margin-top:35px;
}
.add-space{
  margin:4px;
}
.right {
  position: absolute;
  right: 50px;
}
.loader-size{
  margin-top:10px
}

</style>
