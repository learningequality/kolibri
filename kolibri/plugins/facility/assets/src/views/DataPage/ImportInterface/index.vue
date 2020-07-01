<template>

  <KPageContainer>

    <h1> {{ $tr('sectionTitle') }}</h1>
    <p>
      {{ $tr('sectionDescription') }}
    </p>
    <ul>
      <li>{{ $tr('exportCSV') }}</li>
      <li>{{ $tr('editCSV') }}</li>
      <li>{{ $tr('importCSV') }}</li>
    </ul>
    <p>
      <KButton
        appearance="basic-link"
        :text="$tr('viewFormat')"
        @click="showInfoModal = true"
      />
    </p>
    <p style="margin-top: 24px;">
      <KRouterLink
        :text="$tr('import')"
        appearance="raised-button"
        style="margin: 0 16px 0 0;"
        :to="$store.getters.facilityPageLinks.ImportCsvPage"
      />
      <KButton
        :text="$tr('export')"
        appearance="raised-button"
        style="margin: 0 16px 0 0;"
        :disabled="isExporting"
        @click="exportCsv"
      />
      <DataPageTaskProgress v-if="isExporting">
        {{ $tr('generatingCSV') }}
      </DataPageTaskProgress>
    </p>


    <CsvInfoModal
      v-if="showInfoModal"
      @cancel="showInfoModal = false"
    />

  </KPageContainer>

</template>


<script>

  import urls from 'kolibri.urls';
  import { mapState, mapActions } from 'vuex';
  import { UsersExportStatuses } from '../../../constants';
  import DataPageTaskProgress from '../DataPageTaskProgress';
  import CsvInfoModal from '../../CsvInfoModal';

  export default {
    name: 'ImportInterface',
    components: {
      DataPageTaskProgress,
      CsvInfoModal,
    },
    data() {
      return {
        showInfoModal: false,
      };
    },
    computed: {
      ...mapState('manageCSV', ['exportUsersStatus', 'exportUsersFilename']),
      isExporting() {
        return this.exportUsersStatus === UsersExportStatuses.EXPORTING;
      },
    },
    watch: {
      exportUsersStatus(val) {
        if (val == UsersExportStatuses.FINISHED) {
          window.open(
            urls['kolibri:kolibri.plugins.facility:download_csv_file'](
              this.exportUsersFilename,
              this.$store.getters.activeFacilityId
            ),
            '_blank'
          );
        }
      },
    },
    methods: {
      ...mapActions('manageCSV', ['startExportUsers']),
      exportCsv() {
        this.startExportUsers();
      },
    },
    $trs: {
      sectionTitle: 'Import and export users',
      sectionDescription: 'You can manage, import and export many users and classes at once:',
      exportCSV:
        'Export a CSV file which contains all users, and the classes that they are associated with',
      editCSV: 'Edit user info using an external spreadsheet program',
      importCSV: 'Import a CSV file to create and update users',
      export: 'Export',
      import: 'Import',
      generatingCSV: 'Generating CSV...',
      viewFormat: 'View spreadsheet format reference',
    },
  };

</script>


<style lang="scss" scoped></style>
