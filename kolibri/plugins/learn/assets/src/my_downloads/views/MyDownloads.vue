<template>

  <AppBarPage
    :title="coreString('myDownloadsLabel')"
    :loading="downloadsLoading.value || storageLoading.value"
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
                v-if="!storageLoading.value"
              >
                {{ formattedSize(storage.value.myDownloadsSize) }}
              </td>
            </tr>
            <tr>
              <th> {{ coreString('availableStorage') }}</th>
              <td
                v-if="!storageLoading.value"
              >
                {{ formattedSize(storage.value.freeDiskSize) }}
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
      <DownloadsList
        :downloads="downloads || {}"
        :totalDownloads="totalDownloads"
        :totalPageNumber="totalPageNumber"
        :loading="downloadsLoading.value"
        @removeResources="removeResources"
      />
    </KPageContainer>
  </AppBarPage>

</template>


<script>

  import { get, set } from '@vueuse/core';
  import bytesForHumans from 'kolibri.utils.bytesForHumans';
  import AppBarPage from 'kolibri.coreVue.components.AppBarPage';
  import { computed, getCurrentInstance, watch, ref } from 'kolibri.lib.vueCompositionApi';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import useDownloadRequests from '../../composables/useDownloadRequests';
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
        fetchUserDownloadRequests,
        fetchDownloadsStorageInfo,
        removeDownloadRequest,
        removeDownloadsRequest,
      } = useDownloadRequests();

      const store = getCurrentInstance().proxy.$store;
      const route = computed(() => store.state.route);
      const query = computed(() => get(route).query);

      const pageNumber = computed(() => Number(query.value.page || 1));
      const pageSizeNumber = computed(() => Number(query.value.page_size || 25));
      const activityType = computed(() => query.value.activity || 'all');
      const sort = computed(() => query.value.sort || 'newest');

      const downloadsLoading = ref(true);
      const downloads = ref({});
      const totalDownloads = ref(0);
      const totalPageNumber = ref(0);
      const fetchDownloads = () => {
        const loadingFetch = fetchUserDownloadRequests({
          sort: sort.value,
          page: pageNumber.value,
          pageSize: pageSizeNumber.value,
          activityType: activityType.value,
        });
        set(downloadsLoading, loadingFetch);
        set(downloads, downloadRequestMap.downloads);
      };
      fetchDownloads();

      const storageLoading = ref(true);
      const storage = ref({});
      const fetchStorageInfo = () => {
        const { loading: loadingFetch, storageInfo } = fetchDownloadsStorageInfo();
        set(storageLoading, loadingFetch);
        set(storage, storageInfo);
      };
      fetchStorageInfo();

      watch(route, fetchDownloads);
      watch(downloadRequestMap, () => {
        set(downloads, downloadRequestMap.downloads);
        set(totalDownloads, downloadRequestMap.totalDownloads);
        set(totalPageNumber, downloadRequestMap.totalPageNumber);
      });

      return {
        downloads,
        downloadsLoading,
        totalDownloads,
        totalPageNumber,
        storage,
        storageLoading,
        removeDownloadRequest,
        removeDownloadsRequest,
      };
    },
    methods: {
      formattedSize(size) {
        return bytesForHumans(size);
      },
      removeResources(resources) {
        if (resources.length === 1) {
          this.removeDownloadRequest({ id: resources[0] });
        } else {
          this.removeDownloadsRequest(resources.map(resource => ({ id: resource })));
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
