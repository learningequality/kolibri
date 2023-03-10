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
              <th>Total size of my downloads</th>
              <td
                v-if="!storageLoading.value"
              >
                {{ formattedSize(storage.value.myDownloadsSize) }}
              </td>
            </tr>
            <tr>
              <th>Total size of my library</th>
              <td
                v-if="!storageLoading.value"
              >
                {{ formattedSize(storage.value.myLibrarySize) }}
              </td>
            </tr>
            <tr>
              <th>Free disk space</th>
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
          <KSelect
            class="selector"
            :style="selectorStyle"
            :inline="windowIsLarge"
            label="Activity type"
            :options="activityTypes"
            :value="activityTypeSelected"
            @change="handleActivityTypeChange($event.value)"
          >
            <template #display>
              <KLabeledIcon
                :label="activityTypeSelected.label"
                :icon="activityTypeSelected.icon"
              />
            </template>
            <template #option="{ option }">
              <KLabeledIcon
                :label="option.label"
                :icon="option.icon"
                :style="{ padding: '8px' }"
              />
            </template>
          </KSelect>
          <KSelect
            class="selector"
            :style="selectorStyle"
            :inline="windowIsLarge"
            label="Sort by"
            :options="sortOptions"
            :value="sortOptionSelected"
            @change="handleSortChange($event.value)"
          />
        </KGridItem>
      </KGrid>
      <DownloadsList
        :downloads="downloads || {}"
        :totalDownloads="totalDownloads"
        :totalPageNumber="totalPageNumber"
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

  export default {
    name: 'MyDownloads',
    components: {
      AppBarPage,
      DownloadsList,
    },
    mixins: [commonCoreStrings, responsiveWindowMixin],
    setup() {
      const {
        downloadRequestMap,
        fetchUserDownloadRequests,
        fetchDownloadsStorageInfo,
      } = useDownloadRequests();
      const store = getCurrentInstance().proxy.$store;
      const route = computed(() => store.state.route);
      const query = computed(() => get(route).query);

      const pageNumber = computed(() => Number(query.value.page || 1));
      const pageSizeNumber = computed(() => Number(query.value.page_size || 30));

      const downloadsLoading = ref(true);
      const downloads = ref({});
      const totalDownloads = ref(0);
      const totalPageNumber = ref(0);
      const fetchDownloads = () => {
        const loadingFetch = fetchUserDownloadRequests({
          page: pageNumber.value,
          pageSize: pageSizeNumber.value,
          sort: 'desc',
        });
        set(downloadsLoading, loadingFetch);
        set(downloads, downloadRequestMap.downloads);
        console.log('downloads', { ...downloads.value });
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
      };
    },
    data() {
      return {
        activityTypeSelected: {
          label: 'All',
          value: 'all',
          icon: 'allActivities',
        },
        activityTypes: [
          {
            label: 'All',
            value: 'all',
            icon: 'allActivities',
          },
          {
            label: 'Watch',
            value: 'watch',
            icon: 'watchSolid',
          },
          {
            label: 'Read',
            value: 'read',
            icon: 'readSolid',
          },
          {
            label: 'Practice',
            value: 'practice',
            icon: 'practiceSolid',
          },
          {
            label: 'Reflect',
            value: 'reflect',
            icon: 'reflectSolid',
          },
          {
            label: 'Listen',
            value: 'listen',
            icon: 'listenSolid',
          },
          {
            label: 'create',
            value: 'create',
            icon: 'createSolid',
          },
          {
            label: 'Explore',
            value: 'explore',
            icon: 'interactSolid',
          },
        ],
        sortOptionSelected: {
          label: 'Newest',
          value: 'newest',
        },
        sortOptions: [
          {
            label: 'Newest',
            value: 'newest',
          },
          {
            label: 'Oldest',
            value: 'oldest',
          },
          {
            label: 'Largest file size',
            value: 'largest',
          },
          {
            label: 'Smallest file size',
            value: 'smallest',
          },
        ],
      };
    },
    computed: {
      selectorStyle() {
        // return styles for child component with class ".selector"
        return {
          color: this.$themeTokens.text,
          backgroundColor: this.$themePalette.grey.v_200,
          borderRadius: '2px',
          marginTop: '16px',
          marginBottom: 0,
          width: this.windowIsLarge
            ? 'calc(50% - 16px)' // 16px is the margin of the select
            : '100%',
        };
      },
    },
    methods: {
      handleActivityTypeChange(value) {
        this.activityTypeSelected = this.activityTypes.find(
          activityType => activityType.value === value
        );
      },
      handleSortChange(value) {
        this.sortOptionSelected = this.sortOptions.find(sortOption => sortOption.value === value);
      },
      formattedSize(size) {
        return bytesForHumans(size);
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
