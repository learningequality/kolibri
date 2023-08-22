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
      fetchDownloads();
      fetchAvailableFreespace();
      watch(route, fetchDownloads);

      return {
        downloadRequestMap,
        loading,
        availableSpace,
        totalPageNumber,
        fetchAvailableFreespace,
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
          resources.forEach(resource => {
            this.removeDownloadRequest({ id: resource.id });
          });
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
