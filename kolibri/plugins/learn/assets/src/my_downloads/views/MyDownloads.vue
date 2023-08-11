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



      <div v-if="loading">
        <!-- <KCircularLoader v-if="setLazyLoading" /> -->

        <p
          class="text-center"
        >
          {{ coreString('noResourcesDownloaded') }}
        </p>

      </div>

      <!--  -->
      <DownloadsList
        v-else
        :downloads="sortedFilteredDownloads()"
        :totalDownloads="sortedFilteredDownloads().length"
        :totalPageNumber="totalPageNumber"
        :loading="false"
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
        loading,
        fetchUserDownloadRequests,
        fetchAvailableFreespace,
        availableSpace,
        removeDownloadRequest,
        removeDownloadsRequest,
      } = useDownloadRequests();

      const store = getCurrentInstance().proxy.$store;
      const route = computed(() => store.state.route);
      const query = computed(() => get(route).query);

      const pageNumber = computed(() => Number(query.value.page || 1));
      const pageSizeNumber = computed(() => Number(query.value.page_size || 25));
      const activityType = computed(() => query.value.activity || 'all');
      const sort = computed(() => query.value.sort);
      const totalPageNumber = ref(0);

      const fetchDownloads = () => {
        fetchUserDownloadRequests({
          sort: sort.value,
          page: pageNumber.value,
          pageSize: pageSizeNumber.value,
          activityType: activityType.value,
        });
      };
      const sortedFilteredDownloads = () => {
        let downloadsToDisplay;
        if (downloadRequestMap && downloadRequestMap.value.length > 0) {
          downloadsToDisplay = downloadRequestMap.value;
          if (sort) {
            switch (sort.value) {
              case 'newest':
                downloadsToDisplay.sort(
                  (a, b) => new Date(b.requested_at) - new Date(a.requested_at)
                );
                break;
              case 'oldest':
                downloadsToDisplay.sort(
                  (a, b) => new Date(a.requested_at) - new Date(b.requested_at)
                );
                break;
              case 'smallest':
                downloadsToDisplay.sort((a, b) => a.metadata.file_size - b.metadata.file_size);
                break;
              case 'largest':
                downloadsToDisplay.sort((a, b) => b.metadata.file_size - a.metadata.file_size);
                break;
              default:
                // If no valid sort option provided, return unsorted array
                break;
            }
          }
          if (activityType) {
            if (activityType.value !== 'all') {
              downloadsToDisplay = downloadsToDisplay.filter(download =>
                download.metadata.learning_activities.includes(activityType.value)
              );
            }
          }
        }
        set(totalPageNumber, Math.ceil(downloadsToDisplay.length / pageSizeNumber.value));
        return downloadsToDisplay;
      };
      fetchDownloads();
      fetchAvailableFreespace();
      watch(route, sortedFilteredDownloads);

      return {
        downloadRequestMap,
        loading,
        availableSpace,
        totalPageNumber,
        fetchAvailableFreespace,
        sortedFilteredDownloads,
        removeDownloadRequest,
        removeDownloadsRequest,
      };
    },
    computed: {
      sizeOfMyDownloads() {
        let totalSize = 0;
        if (this.downloadRequestMap && this.downloadRequestMap.value) {
          this.downloadRequestMap.value.map(
            item => (totalSize = totalSize + item.metadata.file_size)
          );
        }
        return totalSize;
      },
    },
    beforeMount() {
      this.setLazyLoading();
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
        if (resources.length === 1) {
          this.removeDownloadRequest(resources[0]);
        } else {
          this.removeDownloadsRequest(resources.map(resource => ({ id: resource })));
        }
      },
      setLazyLoading() {
        var isloading = true;
        setTimeout(function() {
          isloading = false;
          return isloading;
        }, 1000);
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

  .text-center {
    text-align: center;
  }

</style>
