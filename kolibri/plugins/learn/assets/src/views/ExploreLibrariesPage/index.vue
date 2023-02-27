<template>

  <ImmersivePage
    :appBarTitle="$tr('exploreLibrariesTitle')"
    :route="backRoute"
  >
    <KPageContainer />
  </ImmersivePage>

</template>


<script>

  import ImmersivePage from 'kolibri.coreVue.components.ImmersivePage';
  import useChannels from '../../composables/useChannels';
  import useDevices from '../../composables/useDevices';
  import { PageNames } from '../../constants';

  export default {
    name: 'ExploreLibrariesPage',
    components: {
      ImmersivePage,
    },
    setup() {
      const { fetchChannels } = useChannels();
      const { fetchDevices } = useDevices();

      return {
        fetchChannels,
        fetchDevices,
      };
    },
    computed: {
      backRoute() {
        return { name: PageNames.LIBRARY };
      },
    },
    created() {
      this.fetchDevices().then(devices => {
        console.log(devices);
        for (const device of devices) {
          const baseurl = device.base_url;
          this.fetchChannels({ baseurl }).then(channels => {
            console.log(device.device_name, channels);
          });
        }
      });
    },
    $trs: {
      exploreLibrariesTitle: {
        message: 'Explore libraries',
        context: 'Title for Explore Libraries page',
      },
    },
  };

</script>
