<template>

  <form>

    <PaginatedListContainerWithBackend
      v-model="currentPage"
      :itemsPerPage="itemsPerPage"
      :totalPageNumber="totalPageNumber"
      :numFilteredItems="totalDownloads"
    >
      <CoreTable>
        <template #headers>
          <th>
            <KCheckbox
              showLabel
              class="select-all"
              :label="coreString('nameLabel')"
              :checked="areAllSelected"
              :disabled="!downloads || !Object.keys(downloads).length"
              :style="{ color: $themeTokens.annotation }"
              @change="selectAll($event)"
            />
          </th>
          <th> {{ coreString('fileSize') }} </th>
          <th> {{ coreString('dateAdded') }} </th>
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
                  :disabled="nonCompleteStatus(download)"
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
                  :href="genExternalContentURLBackLinkCurrentPage(download)"
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
      <p v-if="!loading && (!downloads || !Object.keys(downloads).length)">
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
  import useContentLink from '../../../composables/useContentLink';
  import useLearningActivities from '../../../composables/useLearningActivities';
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

      return {
        getLearningActivityIcon,
        genExternalContentURLBackLinkCurrentPage,
      };
    },
    props: {
      downloads: {
        type: Array,
        required: true,
      },
      totalDownloads: {
        type: Number,
        required: true,
      },
      totalPageNumber: {
        type: Number,
        required: true,
      },
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
    },
    watch: {
      selectedDownloads(newVal, oldVal) {
        if (newVal.length === 0) {
          this.selectedDownloadsSize = 0;
          return;
        }
        const addedDownloads = newVal.filter(id => !oldVal.includes(id));
        const removedDownloads = oldVal.filter(id => !newVal.includes(id));
        const addedDownloadsSize = addedDownloads.reduce(
          (acc, id) => acc + (this.downloads[id] ? this.downloads[id].metadata.file_size : 0),
          0
        );
        const removedDownloadsSize = removedDownloads.reduce(
          (acc, id) => acc + (this.downloads[id].metadata.file_size ? this.downloads[id] : 0),
          0
        );
        this.selectedDownloadsSize += addedDownloadsSize - removedDownloadsSize;
      },
    },
    methods: {
      nonCompleteStatus(download) {
        return download.status !== 'COMPLETED';
      },
      selectAll() {
        if (this.areAllSelected) {
          this.selectedDownloads = this.selectedDownloads.filter(
            resourceId => !Object.keys(this.downloads).includes(resourceId)
          );
        } else {
          this.selectedDownloads = this.selectedDownloads.concat(
            Object.keys(this.downloads).filter(id => !this.selectedDownloads.includes(id))
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
      },
      removeResources() {
        this.$emit('removeResources', this.resourcesToDelete);
        this.selectedDownloads = this.selectedDownloads.filter(
          resourceId => !this.resourcesToDelete.includes(resourceId)
        );
        this.resourcesToDelete = [];
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
            message = this.coreString('inProgress');
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
