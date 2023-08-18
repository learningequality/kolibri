<template>

  <form>

    <PaginatedListContainerWithBackend
      v-model="currentPage"
      :itemsPerPage="itemsPerPage"
      :totalPageNumber="totalPageNumber"
      :numFilteredItems="downloads.length"
    >
      <CoreTable>
        <template #headers>
          <th>
            <KCheckbox
              showLabel
              class="select-all"
              :label="coreString('nameLabel')"
              :checked="areAllSelected"
              :disabled="!areAnyAvailable"
              :style="{ color: $themeTokens.annotation }"
              @change="selectAll($event)"
            />
          </th>
          <th> {{ coreString('fileSize') }} </th>
          <th> {{ coreString('dateAdded') }} </th>
        </template>
        <template #tbody>
          <tbody v-if="!loading && downloadRequestMap">
            <tr
              v-for="download in paginatedDownloads"
              :key="download.contentnode_id"
              :style="download.status !== 'COMPLETED' ? { color: $themeTokens.annotation } : {}"
            >
              <td>
                <KCheckbox
                  :checked="resourceIsSelected(download)"
                  class="download-checkbox"
                  @change="handleCheckResource(download, $event)"
                >
                  <KLabeledIcon
                    v-if="download.metadata"
                    :icon="getIcon(download.metadata.learning_activities)"
                    :label="download.metadata.title"
                    :style="nonCompleteStatus(download) ? { color: $themeTokens.annotation } : {}"
                  />
                </KCheckbox>
              </td>
              <td>
                {{ formattedResourceSize(download) }}
              </td>
              <td>
                <KIcon
                  v-if="downloadStatusIcon(download)"
                  :icon="downloadStatusIcon(download)"
                  :color="download.status === 'PENDING' ? $themeTokens.annotation : null"
                  class="icon"
                />
                <span class="status-text">{{ formattedDownloadStatus(download) }} </span>
              </td>
              <td class="resource-action">
                <KButton
                  v-if="nonCompleteStatus(download)"
                  :text="coreString('viewAction')"
                  appearance="flat-button"
                  :disabled="true"
                />
                <KExternalLink
                  v-else
                  :text="coreString('viewAction')"
                  appearance="flat-button"
                  :href="genExternalContentURLBackLinkCurrentPage(download.contentnode_id)"
                />
              </td>
              <td class="resource-action">
                <KButton
                  :text="coreString('removeAction')"
                  appearance="flat-button"
                  :disabled="nonCompleteStatus(download)"
                  @click="removeResource(download)"
                />
              </td>
            </tr>
          </tbody>
        </template>
      </CoreTable>
      <p v-if="!loading && (!downloadRequestMap || !Object.keys(downloadRequestMap).length)">
        {{ coreString('noResourcesDownloaded') }}
      </p>
    </PaginatedListContainerWithBackend>
    <SelectionBottomBar
      :count="selectedDownloads.length"
      :size="formattedSelectedSize()"
      @click-remove="resourcesToDelete = selectedDownloads"
    />
    <ConfirmationDeleteModal
      v-if="resourcesToDelete.length"
      :resourcesToDelete="resourcesToDelete"
      @cancel="resourcesToDelete = []"
      @success="removeResources"
    />
  </form>

</template>


<script>

  import pickBy from 'lodash/pickBy';
  import { now } from 'kolibri.utils.serverClock';
  import bytesForHumans from 'kolibri.utils.bytesForHumans';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import PaginatedListContainerWithBackend from 'kolibri-common/components/PaginatedListContainerWithBackend';
  import { computed, getCurrentInstance, watch, ref } from 'kolibri.lib.vueCompositionApi';
  import { get, set } from '@vueuse/core';
  import useContentLink from '../../../composables/useContentLink';
  import useLearningActivities from '../../../composables/useLearningActivities';
  import useDownloadRequests from '../../../composables/useDownloadRequests';
  import SelectionBottomBar from './SelectionBottomBar.vue';
  import ConfirmationDeleteModal from './ConfirmationDeleteModal.vue';

  export default {
    name: 'DownloadsList',
    components: {
      CoreTable,
      SelectionBottomBar,
      ConfirmationDeleteModal,
      PaginatedListContainerWithBackend,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { genExternalContentURLBackLinkCurrentPage } = useContentLink();
      const { getLearningActivityIcon } = useLearningActivities();
      const { downloadRequestMap, availableSpace } = useDownloadRequests();
      const totalPageNumber = ref(0);
      const store = getCurrentInstance().proxy.$store;
      const query = computed(() => get(route).query);
      const route = computed(() => store.state.route);
      const sort = computed(() => query.value.sort);
      const pageSizeNumber = computed(() => Number(query.value.page_size || 25));
      const activityType = computed(() => query.value.activity || 'all');
      const downloads = ref([]);
      const sortedFilteredDownloads = () => {
        let downloadsToDisplay = [];
        if (downloadRequestMap) {
          for (const [, value] of Object.entries(downloadRequestMap)) {
            downloadsToDisplay.push(value);
          }
          if (activityType) {
            if (activityType.value !== 'all') {
              downloadsToDisplay = downloadsToDisplay.filter(download =>
                download.metadata.learning_activities.includes(activityType.value)
              );
            }
          }
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
        }
        set(totalPageNumber, Math.ceil(downloadsToDisplay.length / pageSizeNumber.value));
        set(downloads, downloadsToDisplay);
      };
      sortedFilteredDownloads();
      watch(route, () => {
        sortedFilteredDownloads();
      });
      return {
        downloadRequestMap,
        downloads,
        getLearningActivityIcon,
        sortedFilteredDownloads,
        totalPageNumber,
        availableSpace,
        genExternalContentURLBackLinkCurrentPage,
      };
    },
    props: {
      loading: {
        type: Boolean,
        required: false,
      },
    },
    data() {
      return {
        now: now(),
        selectedDownloadsSize: 0,
        selectedDownloads: [],
        resourcesToDelete: [],
      };
    },
    computed: {
      currentPage: {
        get() {
          return Number(this.$route.query.page || 1);
        },
        set(value) {
          this.$router.push({
            ...this.$route,
            query: pickBy({
              ...this.$route.query,
              page: value,
            }),
          });
        },
      },
      itemsPerPage: {
        get() {
          return Number(this.$route.query.page_size || 25);
        },
        set(value) {
          this.$router.push({
            ...this.$route,
            query: pickBy({
              ...this.$route.query,
              page_size: value,
              page: null,
            }),
          });
        },
      },
      paginatedDownloads() {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        return this.downloads.slice(startIndex, endIndex);
      },
      areAllSelected() {
        return Object.keys(this.downloads).every(id => this.selectedDownloads.includes(id));
      },
      areAnyAvailable() {
        if (this.downloads && this.downloads.length > 0) {
          return this.downloads.filter(download => download.status === 'COMPLETED').length > 0;
        }
        return false;
      },
    },
    watch: {
      selectedDownloads(newVal) {
        this.selectedDownloadsSize = newVal.reduce(
          (acc, object) => acc + object.metadata.file_size,
          0
        );
      },
    },
    mounted() {
      this.areAnyAvailable;
    },
    methods: {
      nonCompleteStatus(download) {
        return download.status !== 'COMPLETED';
      },
      selectAll() {
        if (this.areAllSelected) {
          this.selectedDownloads = this.selectedDownloads.filter(
            download => !this.paginatedDownloads.includes(download)
          );
        } else {
          this.selectedDownloads = this.selectedDownloads.concat(
            this.paginatedDownloads.filter(download => !this.selectedDownloads.includes(download))
          );
        }
      },
      handleCheckResource(id, checked) {
        if (checked) {
          this.selectedDownloads = this.selectedDownloads.concat(id);
          return;
        }
        this.selectedDownloads = this.selectedDownloads.filter(resourceId => resourceId !== id);
      },
      resourceIsSelected(id) {
        return this.selectedDownloads.indexOf(id) !== -1;
      },
      removeResource(download) {
        this.$emit('removeResources', [download]);
        this.sortedFilteredDownloads();
      },
      removeResources() {
        this.$emit('removeResources', this.resourcesToDelete);
        this.resourcesToDelete = [];
        this.sortedFilteredDownloads();
      },
      getIcon(activities) {
        return this.getLearningActivityIcon(activities);
      },
      downloadStatusIcon(download) {
        let icon;
        switch (download.status) {
          case 'PENDING':
            icon = 'timer';
            break;
          case 'FAILED':
            icon = 'error';
            break;
          default:
            // If no valid sort option provided, return unsorted array
            break;
        }
        return icon;
      },
      formattedDownloadStatus(download) {
        let message = '';
        switch (download.status) {
          case 'PENDING':
            message = this.coreString('waitingToDownload');
            break;
          case 'IN_PROGRESS':
            message = this.coreString('inProgressLabel');
            break;
          case 'COMPLETED' && this.now - download.requested_at < 10000:
            message = this.coreString('justNow');
            break;
          case 'COMPLETED':
            message = this.$formatRelative(download.requested_at, { now: this.now });
            break;
          case 'FAILED':
            message = this.coreString('downloadFailedWillRetry');
            break;
          default:
            // If no valid sort option provided, return unsorted array
            break;
        }
        return message;
      },
      formattedResourceSize(download) {
        if (download.metadata && download.metadata.file_size) {
          return bytesForHumans(download.metadata.file_size);
        }
      },
      formattedSelectedSize() {
        return bytesForHumans(this.selectedDownloadsSize);
      },
    },
  };

</script>


<style lang="scss" scope>

  td {
    vertical-align: middle !important;
  }

  .select-all {
    // This helps the checkbox align with the header text
    position: relative;
    top: 16px;
  }

  .download-checkbox {
    margin-top: 0 !important;
    margin-bottom: 0 !important;
    font-weight: bold;
  }

  .resource-action {
    max-width: 70px !important;
    text-align: right;
  }

  .icon {
    width: 24px !important;
    height: 24px !important;
  }

  .status-text {
    position: relative;
    top: -4px;
    padding: 8px;
  }

</style>
