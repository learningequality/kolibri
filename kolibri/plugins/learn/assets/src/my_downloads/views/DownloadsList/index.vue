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
              :label="$tr('name')"
              :checked="areAllSelected"
              :disabled="!downloads || Object.keys(downloads).length === 0"
              :style="{ color: $themeTokens.annotation }"
              @change="selectAll($event)"
            />
          </th>
          <th> File size </th>
          <th> Date added </th>
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
                  data-test="downloadCheckbox"
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
                <KButton
                  :text="$tr('view')"
                  appearance="flat-button"
                  @click="viewResource(download.node_id)"
                />
              </td>
              <td class="resource-action">
                <KButton
                  :text="$tr('remove')"
                  appearance="flat-button"
                  @click="removeResource(download.node_id)"
                />
              </td>
            </tr>
          </tbody>
        </template>
      </CoreTable>
    </PaginatedListContainerWithBackend>
    <SelectionBottomBar
      :count="selectedDownloads.length"
      :size="'1.2 GB'"
      @click-remove="resourcesToDelete = selectedDownloads"
    />
    <ConfirmationDeleteModal
      v-if="resourcesToDelete.length"
      :resourcesToDelete="resourcesToDelete"
      @cancel="resourcesToDelete = []"
      @success="resourcesToDelete = []"
    />
  </form>

</template>


<script>

  import pickBy from 'lodash/pickBy';
  import { now } from 'kolibri.utils.serverClock';
  import bytesForHumans from 'kolibri.utils.bytesForHumans';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import { LearningActivityToIconMap } from '../../../constants';
  import SelectionBottomBar from './SelectionBottomBar.vue';
  import ConfirmationDeleteModal from './ConfirmationDeleteModal.vue';
  import PaginatedListContainerWithBackend from './PaginatedListContainerWithBackend.vue';

  export default {
    name: 'DownloadsList',
    components: {
      CoreTable,
      SelectionBottomBar,
      ConfirmationDeleteModal,
      PaginatedListContainerWithBackend,
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
    },
    data() {
      return {
        now: now(),
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
          return Number(this.$route.query.page_size || 30);
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
    methods: {
      selectAll() {
        if (this.areAllSelected) {
          this.selectedDownloads = this.selectedDownloads.filter(
            resourceId => !Object.keys(this.downloads).includes(resourceId)
          );
        } else {
          Object.keys(this.downloads).forEach(id => {
            if (!this.selectedDownloads.includes(id)) {
              this.selectedDownloads.push(id);
            }
          });
        }
      },
      handleCheckResource(id, checked) {
        if (checked) {
          this.selectedDownloads.push(id);
          return;
        }
        this.selectedDownloads = this.selectedDownloads.filter(resourceId => resourceId !== id);
      },
      resourceIsSelected(id) {
        return this.selectedDownloads.indexOf(id) !== -1;
      },
      viewResource(id) {
        console.log('view resource', id);
      },
      removeResource(id) {
        console.log('remove resource', id);
        this.resourcesToDelete = [id];
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
    },
    $trs: {
      name: {
        message: 'Name',
        context: "Indicates the resource's name",
      },
      view: {
        message: 'View',
        context: 'Button to view the resource',
      },
      remove: {
        message: 'Remove',
        context: 'Button to remove the resource',
      },
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
