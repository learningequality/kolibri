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
  import bytesForHumans from 'kolibri/uiText/bytesForHumans';
  import AppBarPage from 'kolibri/components/pages/AppBarPage';
  import { computed } from 'vue';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import plugin_data from 'kolibri-plugin-data';
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
