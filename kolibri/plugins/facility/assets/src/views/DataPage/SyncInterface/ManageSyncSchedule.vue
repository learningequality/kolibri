<template>

  <ImmersivePage
    :appBarTitle="$tr('toolbarHeader')"
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
          <KButton>{{ $tr('addDevice') }}</KButton>
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
                <KButton>
                  edit
                </KButton>
              </td>
            </tr>
            <tr>
              <td>
                <span>MacOS<br>
                  localhost:8000</span>

              </td>
              <td>Every Monday at 14:30</td>
              <td>
                <KIcon
                  icon="onDevice"
                />
                Connected
              </td>
              <td>
                <KButton>
                  edit
                </KButton>
              </td>
            </tr>
          </tbody>
        </template>

      </CoreTable>

    </KPageContainer>
  </ImmersivePage>

</template>


<script>

  import ImmersivePage from 'kolibri.coreVue.components.ImmersivePage';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';

  export default {
    name: 'ManageSyncSchedule',
    components: {
      ImmersivePage,
      CoreTable,
    },

    extends: ImmersivePage,

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
        message: 'ADD DEVICE',
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
    },
  };

</script>
