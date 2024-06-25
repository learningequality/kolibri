<template>

  <AppBarPage :title="coreString('myDownloadsLabel')">
    <KPageContainer class="container">
      <h1>{{ coreString('myDownloadsLabel') }}</h1>
      <KGrid>
        <KGridItem
          :layout8="{ span: 4 }"
          :layout12="{ span: 6 }"
        >
          <table>
            <tr>
              <th>{{ coreString('totalSizeMyDownloads') }}</th>
              <td v-if="!loading">
                {{ formattedSize(sizeOfMyDownloads) }}
              </td>
            </tr>
            <tr>
              <th>{{ coreString('availableStorage') }}</th>
              <td v-if="!loading">
                {{ formattedSize(availableStorage) }}
              </td>
            </tr>
          </table>
        </KGridItem>
        <KGridItem
          :layout8="{ span: 4 }"
          :layout12="{ span: 6 }"
        >
          <ActivityFilter />
          <SortFilter />
        </KGridItem>
      </KGrid>
      <KCircularLoader v-if="loading" />

      <DownloadsList
        v-else
        :loading="false"
        @removeResources="removeResources"
      />
    </KPageContainer>
  </AppBarPage>

</template>


<script>

  import { get } from '@vueuse/core';
  import bytesForHumans from 'kolibri.utils.bytesForHumans';
  import AppBarPage from 'kolibri.coreVue.components.AppBarPage';
  import { computed, getCurrentInstance } from 'kolibri.lib.vueCompositionApi';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import plugin_data from 'plugin_data';
  import useDownloadRequests from '../../composables/useDownloadRequests';
  import useDevices from '../../composables/useDevices';
  import DownloadsList from './DownloadsList';
  import ActivityFilter from './Filters/ActivityFilter.vue';
  import SortFilter from './Filters/SortFilter.vue';

  export default {
    name: 'MyDownloads',
    components: {
      AppBarPage,
      DownloadsList,
      ActivityFilter,
      SortFilter,
    },
    mixins: [commonCoreStrings],
    setup() {
      const {
        downloadRequestMap,
        loading,
        pollUserDownloadRequests,
        fetchAvailableFreespace,
        availableSpace,
        removeDownloadRequest,
      } = useDownloadRequests();
      const { fetchDevices } = useDevices();

      const store = getCurrentInstance().proxy.$store;
      const route = computed(() => store.state.route);
      const query = computed(() => get(route).query);

      const sort = computed(() => query.value.sort);

      const availableStorage = computed(() => {
        let space = get(availableSpace);
        if (plugin_data.setLimitForAutodownload) {
          space = Math.min(space, plugin_data.limitForAutodownload);
        }
        return space;
      });

      fetchAvailableFreespace();
      pollUserDownloadRequests();

      return {
        downloadRequestMap,
        loading,
        availableSpace,
        fetchAvailableFreespace,
        fetchDevices,
        sort,
        removeDownloadRequest,
        availableStorage,
      };
    },
    computed: {
      sizeOfMyDownloads() {
        return Object.values(this.downloadRequestMap).reduce(
          (acc, object) => acc + object.metadata.file_size,
          0,
        );
      },
    },
    methods: {
      formattedSize(size) {
        if (size > 0) {
          return bytesForHumans(size);
        } else {
          return bytesForHumans(0);
        }
      },
      removeResources(contentNodeIds) {
        for (const contentNodeId of contentNodeIds) {
          this.removeDownloadRequest(contentNodeId);
        }
      },
    },
  };

</script>


<style lang="scss" scoped>

  .container {
    min-height: 450px;
  }

  .selector {
    /deep/ .ui-select-label-text {
      padding: 10px 10px 0;
    }

    /deep/ .ui-select-display {
      padding: 0 10px;
    }
  }

  th {
    text-align: left;
  }

  td {
    text-align: right;
  }

  th,
  td {
    height: 2em;
    padding-right: 24px;
    font-size: 14px;
  }

</style>
