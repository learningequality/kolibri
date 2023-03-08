<template>

  <form>

    <PaginatedListContainerWithBackend
      v-model="currentPage"
      :itemsPerPage="itemsPerPage"
      :totalPageNumber="totalPageNumber"
      :numFilteredItems="numFilteredItems"
    >
      <CoreTable>
        <template #headers>
          <th>
            <KCheckbox
              showLabel
              class="select-all"
              :label="$tr('name')"
              :checked="allAreSelected"
              :disabled="false && (!downloads || downloads.length === 0)"
              :style="{ color: $themeTokens.annotation }"
              @change="selectAll($event)"
            />
          </th>
          <th> File size </th>
          <th> Date added </th>
        </template>
        <template #tbody>
          <tbody>
            <tr>
              <td>
                <KCheckbox
                  :checked="resourceIsSelected(1)"
                  class="download-checkbox"
                  data-test="userCheckbox"
                  @change="handleCheckResource(1, $event)"
                >
                  <KLabeledIcon
                    :icon="'watchSolid'"
                    :label="'Resource 1 Watch this video'"
                  />
                </KCheckbox>
              </td>
              <td>
                f
              </td>
              <td>zz</td>
              <td class="resource-action">
                <KButton
                  :text="$tr('view')"
                  appearance="flat-button"
                  @click="viewResource(1)"
                />
              </td>
              <td class="resource-action">
                <KButton
                  :text="$tr('remove')"
                  appearance="flat-button"
                  @click="removeResource(1)"
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
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
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
        type: Array,
        required: true,
      },
    },
    data() {
      return {
        selectedDownloads: [],
        allAreSelected: false,
        totalPageNumber: 3,
        numFilteredItems: 30,
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
          return this.$route.query.page_size || 30;
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
    },
    watch: {
      downloads(newVal) {
        console.log('watch', newVal);
      },
    },
    methods: {
      selectAll() {
        this.allAreSelected = !this.allAreSelected;
        if (this.allAreSelected) {
          this.selectedDownloads = this.downloads;
        } else {
          this.selectedDownloads = [];
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
