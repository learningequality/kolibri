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
          <tbody>
            <tr
              v-for="download in Object.values(downloads)"
              :key="download.node_id"
            >
              <td>
                <KCheckbox
                  :checked="resourceIsSelected(download.node_id)"
                  class="download-checkbox"
                  @change="handleCheckResource(download.node_id, $event)"
                >
                  <KLabeledIcon
                    :icon="getIcon(download)"
                    :label="download.resource_metadata.title"
                  />
                </KCheckbox>
              </td>
              <td>
                {{ formattedResourceSize(download) }}
              </td>
              <td>
                {{ formattedTime(download) }}
              </td>
              <td class="resource-action">
                <KExternalLink
                  :text="coreString('viewAction')"
                  appearance="flat-button"
                  :href="genExternalContentURLBackLinkCurrentPage(download.node_id)"
                />
              </td>
              <td class="resource-action">
                <KButton
                  :text="coreString('removeAction')"
                  appearance="flat-button"
                  @click="removeResource(download.node_id)"
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
  import { LearningActivityToIconMap } from '../../../constants';
  import useContentLink from '../../../composables/useContentLink';
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

      return {
        genExternalContentURLBackLinkCurrentPage,
      };
    },
    props: {
      downloads: {
        type: Object,
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
          (acc, id) =>
            acc + (this.downloads[id] ? this.downloads[id].resource_metadata.file_size : 0),
          0
        );
        const removedDownloadsSize = removedDownloads.reduce(
          (acc, id) =>
            acc + (this.downloads[id] ? this.downloads[id].resource_metadata.file_size : 0),
          0
        );
        this.selectedDownloadsSize += addedDownloadsSize - removedDownloadsSize;
      },
    },
    methods: {
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
      removeResource(id) {
        this.resourcesToDelete = [id];
      },
      removeResources() {
        this.$emit('removeResources', this.resourcesToDelete);
        this.selectedDownloads = this.selectedDownloads.filter(
          resourceId => !this.resourcesToDelete.includes(resourceId)
        );
        this.resourcesToDelete = [];
      },
      getIcon(download) {
        return LearningActivityToIconMap[download.resource_metadata.learning_activities[0]];
      },
      formattedTime(download) {
        const datetime = download.date_added;
        if (this.now - datetime < 10000) {
          return this.$tr('justNow');
        }
        return this.$formatRelative(datetime, { now: this.now });
      },
      formattedResourceSize(download) {
        return bytesForHumans(download.resource_metadata.file_size);
      },
      formattedSelectedSize() {
        return bytesForHumans(this.selectedDownloadsSize);
      },
    },
    $trs: {
      justNow: {
        message: 'Just now',
        context: 'This is used to indicate that a download was added to the list very recently',
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

</style>
