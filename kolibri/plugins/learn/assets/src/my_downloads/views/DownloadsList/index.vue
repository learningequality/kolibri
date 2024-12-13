<template>

  <form>
    <PaginatedListContainerWithBackend
      v-model="currentPage"
      :itemsPerPage="itemsPerPage"
      :totalPageNumber="totalPageNumber"
      :numFilteredItems="downloadItemListLength"
    >
      <CoreTable>
        <template #headers>
          <th>
            <KCheckbox
              showLabel
              class="select-all"
              :label="coreString('nameLabel')"
              :checked="areAllSelected"
              :indeterminate="areAnySelected && !areAllSelected"
              :disabled="!areAnyAvailable"
              :style="{ color: $themeTokens.annotation }"
              @change="selectAll($event)"
            />
          </th>
          <th v-if="windowIsLarge">
            {{ coreString('fileSize') }}
          </th>
          <th v-if="windowIsLarge">
            {{ coreString('dateAdded') }}
          </th>
          <th v-if="windowIsLarge">
            {{ coreString('statusLabel') }}
          </th>
        </template>
        <template #tbody>
          <tbody v-if="!loading">
            <tr
              v-for="download in paginatedDownloads"
              :key="download.contentnode_id"
              :style="download.status !== 'COMPLETED' ? { color: $themeTokens.annotation } : {}"
            >
              <td :class="{ 'small-resource-details': !windowIsLarge }">
                <KCheckbox
                  :checked="Boolean(selectedDownloadsMap[download.contentnode_id])"
                  class="download-checkbox"
                  @change="handleCheckResource(download.contentnode_id, $event)"
                >
                  <KLabeledIcon
                    v-if="download.metadata"
                    :icon="getIcon(download.metadata.learning_activities)"
                    :label="download.metadata.title"
                    :style="nonCompleteStatus(download) ? { color: $themeTokens.annotation } : {}"
                  />
                </KCheckbox>
                <div
                  v-if="!windowIsLarge"
                  class="small-screen-status"
                >
                  <p>
                    {{ formattedResourceSize(download) }} &nbsp;&nbsp;
                    {{ formatDownloadRequestedDate(download) }}
                  </p>
                  <KIcon
                    v-if="download.status !== 'IN_PROGRESS'"
                    :icon="downloadStatusIcon(download)"
                    :color="download.status === 'PENDING' ? $themeTokens.annotation : null"
                    class="icon"
                  />
                  <div
                    v-if="download.status === 'IN_PROGRESS'"
                    class="inline-loader"
                  >
                    <KCircularLoader
                      :size="20"
                      :disableDefaultTransition="true"
                      class="icon"
                    />
                  </div>
                  <span class="status-text">{{ formattedDownloadStatus(download) }} </span>
                </div>
              </td>
              <td v-if="windowIsLarge">
                {{ formattedResourceSize(download) }}
              </td>
              <td v-if="windowIsLarge">
                {{ formatDownloadRequestedDate(download) }}
              </td>
              <td v-if="windowIsLarge">
                <KIcon
                  v-if="download.status !== 'IN_PROGRESS'"
                  :icon="downloadStatusIcon(download)"
                  :color="download.status === 'PENDING' ? $themeTokens.annotation : null"
                  class="icon"
                />
                <div
                  v-if="download.status === 'IN_PROGRESS'"
                  class="inline-loader"
                >
                  <KCircularLoader
                    :size="20"
                    :disableDefaultTransition="true"
                    class="icon"
                  />
                </div>
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
                <KButton
                  :text="coreString('removeAction')"
                  appearance="flat-button"
                  @click="markSingleResourceForRemoval(download)"
                />
              </td>
            </tr>
          </tbody>
        </template>
      </CoreTable>
      <p v-if="!loading && !downloadItemListLength">
        {{ coreString('noResourcesDownloaded') }}
      </p>
    </PaginatedListContainerWithBackend>
    <SelectionBottomBar
      :count="Object.keys(selectedDownloadsMap).length"
      :size="formattedSelectedSize"
      @click-remove="removeSelectedResources"
    />
    <ConfirmationDeleteModal
      v-if="resourcesToDelete.length"
      :resourcesToDelete="resourcesToDelete"
      @cancel="resourcesToDelete = []"
      @success="emitCurrentlySelectedResourcesForRemoval"
    />
  </form>

</template>


<script>

  import pickBy from 'lodash/pickBy';
  import { now } from 'kolibri/utils/serverClock';
  import bytesForHumans from 'kolibri/uiText/bytesForHumans';
  import CoreTable from 'kolibri/components/CoreTable';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import PaginatedListContainerWithBackend from 'kolibri-common/components/PaginatedListContainerWithBackend';
  import { computed, getCurrentInstance } from 'vue';
  import { get } from '@vueuse/core';
  import { createTranslator } from 'kolibri/utils/i18n';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import useContentLink from '../../../composables/useContentLink';
  import useDevices from '../../../composables/useDevices';
  import useLearningActivities from '../../../composables/useLearningActivities';
  import useDownloadRequests from '../../../composables/useDownloadRequests';
  import SelectionBottomBar from './SelectionBottomBar.vue';
  import ConfirmationDeleteModal from './ConfirmationDeleteModal.vue';

  const ChannelContentsSummaryStrings = createTranslator('ChannelContentsSummary', {
    onDeviceRow: {
      message: 'On your device',
      context: "Indicates resources that are on the user's device.",
    },
  });

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
      const { downloadRequestMap } = useDownloadRequests();
      const { networkDevices } = useDevices();
      const { windowIsLarge } = useKResponsiveWindow();
      const store = getCurrentInstance().proxy.$store;
      const query = computed(() => get(route).query);
      const route = computed(() => store.state.route);
      const pageSizeNumber = computed(() => Number(query.value.page_size || 25));
      return {
        downloadRequestMap,
        pageSizeNumber,
        getLearningActivityIcon,
        networkDevices,
        windowIsLarge,
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
        selectedDownloadsMap: {},
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
      downloads() {
        const sort = this.$route.query.sort;
        const activityType = this.$route.query.activity;
        const downloadsToDisplay = Object.values(this.downloadRequestMap).filter(download => {
          if (activityType && activityType !== 'all') {
            return download.metadata.learning_activities.includes(activityType);
          }
          return true;
        });
        downloadsToDisplay.sort((a, b) => {
          if (sort === 'oldest') {
            return new Date(a.requested_at) - new Date(b.requested_at);
          }
          if (sort === 'smallest') {
            return a.metadata.file_size - b.metadata.file_size;
          }
          if (sort === 'largest') {
            return b.metadata.file_size - a.metadata.file_size;
          }
          // By default always sort by newest.
          return new Date(b.requested_at) - new Date(a.requested_at);
        });
        return downloadsToDisplay;
      },
      paginatedDownloads() {
        if (this.downloads && this.downloads.length > 0) {
          const startIndex = (this.currentPage - 1) * this.itemsPerPage;
          const endIndex = startIndex + this.itemsPerPage;
          return this.downloads.slice(startIndex, endIndex);
        }
        return [];
      },
      downloadItemListLength() {
        return this.downloads ? this.downloads.length : 0;
      },
      totalPageNumber() {
        if (this.downloads && this.downloads.length && this.pageSizeNumber) {
          return Math.ceil(this.downloads.length / this.pageSizeNumber);
        }
        return 1;
      },
      areAllSelected() {
        return (
          this.areAnySelected &&
          this.paginatedDownloads.every(download =>
            Boolean(this.selectedDownloadsMap[download.contentnode_id]),
          )
        );
      },
      areAnySelected() {
        return this.paginatedDownloads.some(download =>
          Boolean(this.selectedDownloadsMap[download.contentnode_id]),
        );
      },
      areAnyAvailable() {
        return this.paginatedDownloads.length > 0;
      },
      formattedSelectedSize() {
        return bytesForHumans(
          Object.keys(this.selectedDownloadsMap).reduce((acc, contentnode_id) => {
            return acc + (this.downloadRequestMap[contentnode_id]?.metadata?.file_size || 0);
          }, 0),
        );
      },
    },
    methods: {
      nonCompleteStatus(download) {
        return download.status !== 'COMPLETED';
      },
      selectAll() {
        const notAllSelected = !this.areAllSelected;
        for (const download of this.paginatedDownloads) {
          this.handleCheckResource(download.contentnode_id, notAllSelected);
        }
      },
      handleCheckResource(contentnode_id, checked) {
        if (checked) {
          this.$set(this.selectedDownloadsMap, contentnode_id, checked);
        } else {
          this.$delete(this.selectedDownloadsMap, contentnode_id);
        }
      },
      markSingleResourceForRemoval(download) {
        this.resourcesToDelete.push(download.contentnode_id);
      },
      removeSelectedResources() {
        this.resourcesToDelete = Object.keys(this.selectedDownloadsMap);
      },
      emitCurrentlySelectedResourcesForRemoval() {
        this.$emit('removeResources', this.resourcesToDelete);
        this.resourcesToDelete = [];
        this.$nextTick(() => {
          this.selectedDownloadsMap = {};
          if (this.paginatedDownloads.length == 0 && this.$route.query.page) {
            const prevPage = this.currentPage - 1;
            this.currentPage = prevPage;
          }
        });
      },
      getIcon(activities) {
        return this.getLearningActivityIcon(activities);
      },
      sourceDeviceIsAvailable(download) {
        return Boolean(this.networkDevices[download.source_id]);
      },
      downloadStatusIcon(download) {
        let icon;
        switch (download.status) {
          case 'COMPLETED':
            icon = 'correct';
            break;
          case 'PENDING':
            icon = 'timer';
            break;
          case 'FAILED':
            icon = 'error';
            break;
          case 'IN_PROGRESS':
            icon = 'error';
            break;
          default:
            // If no valid sort option provided, return unsorted array
            break;
        }
        return icon;
      },
      formatDownloadRequestedDate(download) {
        return this.$formatRelative(download.requested_at, { now: this.now });
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
          case 'COMPLETED':
            /* eslint-disable kolibri/vue-no-undefined-string-uses */
            message = ChannelContentsSummaryStrings.$tr('onDeviceRow');
            /* eslint-enable */
            break;
          case 'FAILED':
            if (this.sourceDeviceIsAvailable(download)) {
              message = this.coreString('downloadFailedWillRetry');
            } else {
              message = this.coreString('downloadedFailedCanNotRetry');
            }
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
    text-align: right;
  }

  .status-text {
    position: relative;
    padding: 8px;
  }

  .small-screen-status {
    margin: 0 0 0 48px;
    font-size: 12px;
  }

  .inline-loader {
    display: inline-block;
    margin-left: 0;
    vertical-align: bottom;
  }

</style>
