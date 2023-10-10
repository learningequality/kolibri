<template>

  <AppBarPage
    :title="coreString('myDownloadsLabel')"
  >
    <KPageContainer class="container">
      <h1> {{ coreString('myDownloadsLabel') }} </h1>
      <KGrid>
        <KGridItem
          :layout8="{ span: 4 }"
          :layout12="{ span: 6 }"
        >
          <table>
            <tr>
              <th> {{ coreString('totalSizeMyDownloads') }} </th>
              <td
                v-if="!loading"
              >
                {{ formattedSize(sizeOfMyDownloads) }}
              </td>
            </tr>
            <tr>
              <th> {{ coreString('availableStorage') }}</th>
              <td
                v-if="!loading"
              >
                {{ formattedSize(availableSpace) }}
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
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
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
    mixins: [commonCoreStrings, responsiveWindowMixin],
    setup() {
      const {
        downloadRequestMap,
        loading,
        fetchUserDownloadRequests,
        fetchAvailableFreespace,
        availableSpace,
        removeDownloadRequest,
      } = useDownloadRequests();
      const { fetchDevices } = useDevices();

      const store = getCurrentInstance().proxy.$store;
      const route = computed(() => store.state.route);
      const query = computed(() => get(route).query);

      const sort = computed(() => query.value.sort);

      fetchAvailableFreespace();

      return {
        downloadRequestMap,
        loading,
        fetchDownloads: fetchUserDownloadRequests,
        availableSpace,
        fetchAvailableFreespace,
        fetchDevices,
        sort,
        removeDownloadRequest,
      };
    },
    computed: {
      sizeOfMyDownloads() {
        return Object.values(this.downloadRequestMap).reduce(
          (acc, object) => acc + object.metadata.file_size,
          0
        );
      },
    },
    mounted() {
      this.startPolling();
    },
    beforeDestroy() {
      clearInterval(this.pollingInterval);
    },
    methods: {
      formattedSize(size) {
        if (size > 0) {
          return bytesForHumans(size);
        } else {
          return bytesForHumans(0);
        }
      },
      removeResources(resources) {
        for (const resource of resources) {
          this.removeDownloadRequest(resource);
        }
      },
      startPolling() {
        this.fetchDownloads();
        this.pollingInterval = setInterval(async () => {
          await this.fetchDownloads();
          this.calculatePollingInterval();
        }, 1000); // Initial interval of 1 second
      },
      calculatePollingInterval() {
        let pollingInterval = 30000; // Default interval of 30 seconds

        for (const download in this.downloadRequestMap) {
          const status = this.downloadRequestMap[download].status;

          if (status === 'PENDING' || status === 'FAILED') {
            pollingInterval = 5000; // Poll every 5 seconds
            break;
          } else if (status === 'IN_PROGRESS') {
            pollingInterval = 1000; // Poll every 1 second
            break;
          }
        }

        if (pollingInterval !== this.pollingInterval) {
          clearInterval(this.pollingInterval);
          this.pollingInterval = setInterval(async () => {
            await this.fetchDownloads();
            this.calculatePollingInterval();
          }, pollingInterval);
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
