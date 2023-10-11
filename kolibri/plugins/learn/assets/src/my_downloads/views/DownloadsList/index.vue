<template>

  <form>

    <PaginatedListContainerWithBackend
      v-model="currentPage"
      :itemsPerPage="itemsPerPage"
      :totalPageNumber="totalPageNumber"
      :numFilteredItems="downloadItemListLength"
    >
      <CoreTable v-if="windowIsLarge">
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
          <th> {{ coreString('statusLabel') }} </th>
        </template>
        <template #tbody>
          <tbody v-if="!loading">
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
                {{ formatDownloadRequestedDate(download) }}
              </td>
              <td>
                <KIcon
                  v-if="download.status !== 'IN_PROGRESS'"
                  :icon="downloadStatusIcon(download)"
                  :color="download.status === 'PENDING' ? $themeTokens.annotation : null"
                  class="icon"
                />
                <KCircularLoader
                  v-if="download.status === 'IN_PROGRESS'"
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
                  @click="markSingleResourceForRemoval(download)"
                />
              </td>
            </tr>
          </tbody>
        </template>
      </CoreTable>
      <!-- for small and medium screens, reorganize the table -->
      <CoreTable v-else>
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
        </template>
        <template #tbody>
          <tbody v-if="!loading">
            <tr
              v-for="download in paginatedDownloads"
              :key="download.contentnode_id"
              :style="download.status !== 'COMPLETED' ? { color: $themeTokens.annotation } : {}"
            >
              <td class="small-resource-details">
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
                <div class="small-screen-status">
                  <p>
                    {{ formattedResourceSize(download) }} |
                    {{ formatDownloadRequestedDate(download) }}
                  </p>
                  <KIcon
                    v-if="download.status !== 'IN_PROGRESS'"
                    :icon="downloadStatusIcon(download)"
                    :color="download.status === 'PENDING' ? $themeTokens.annotation : null"
                    class="icon"
                  />
                  <KCircularLoader
                    v-if="download.status === 'IN_PROGRESS'"
                    class="icon"
                  />
                  <span class="status-text">{{ formattedDownloadStatus(download) }} </span>
                </div>

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
      :count="selectedDownloads.length"
      :size="formattedSelectedSize()"
      @click-remove="resourcesToDelete = selectedDownloads"
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
  import { now } from 'kolibri.utils.serverClock';
  import bytesForHumans from 'kolibri.utils.bytesForHumans';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import PaginatedListContainerWithBackend from 'kolibri-common/components/PaginatedListContainerWithBackend';
  import { computed, getCurrentInstance } from 'kolibri.lib.vueCompositionApi';
  import { get } from '@vueuse/core';
  import { createTranslator } from 'kolibri.utils.i18n';
  import useKResponsiveWindow from 'kolibri.coreVue.composables.useKResponsiveWindow';
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
      const { downloadRequestMap, availableSpace } = useDownloadRequests();
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
        availableSpace,
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
      downloads() {
        const sort = this.$route.query.sort;
        const activityType = this.$route.query.activity;
        const downloadsToDisplay = Object.values(this.downloadRequestMap).filter(download => {
          if (activityType && activityType !== 'all') {
            return download.metadata.learning_activities.includes(activityType);
          }
          return true;
        });

        if (sort) {
          switch (sort) {
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
              break;
          }
        } else {
          // if no sort value, default to newest downloads shown first in the UI
          downloadsToDisplay.sort((a, b) => new Date(b.requested_at) - new Date(a.requested_at));
        }
        return downloadsToDisplay;
      },
      paginatedDownloads() {
        if (this.downloads && this.downloads.length > 0) {
          const startIndex = (this.currentPage - 1) * this.itemsPerPage;
          const endIndex = startIndex + this.itemsPerPage;
          return this.downloads.slice(startIndex, endIndex);
        } else {
          return [];
        }
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
          this.downloads &&
          this.downloads.filter(id => this.selectedDownloads.includes(id)).length > 0
        );
      },
      areAnyAvailable() {
        return this.downloads && this.downloads.length > 0;
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
      markSingleResourceForRemoval(download) {
        this.resourcesToDelete.push(download);
      },
      emitCurrentlySelectedResourcesForRemoval() {
        this.$emit('removeResources', this.resourcesToDelete);
        this.resourcesToDelete = [];
        this.$nextTick(() => {
          this.selectedDownloads = [];
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
    text-align: right;
  }

  .status-text {
    position: relative;
    padding: 8px;
  }

  .small-screen-status {
    margin: 0 48px;
    font-size: 12px;
  }

</style>
