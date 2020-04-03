<template>

  <KPageContainer>

    <h1> {{ $tr('sectionTitle') }}</h1>
    <p>
      {{ $tr('sectionDescription') }}
    </p>
    <p>
      {{ $tr('exportCSV') }}
    </p>
    <p>
      <KButton
        :text="$tr('export')"
        appearance="raised-button"
        style="margin: 0;"
        :disabled="isExporting"
        @click="exportCsv"
      />
      <DataPageTaskProgress v-if="isExporting" class="generating">
        {{ $tr('generatingCSV') }}
      </DataPageTaskProgress>
    </p>
    <p>
      {{ $tr('importCSV') }}
    </p>
    <p>
      <KRouterLink
        :text="$tr('import')"
        appearance="raised-button"
        :to="$router.getRoute('IMPORT_CSV_PAGE')"
        style="margin: 0;"
      />
    </p>

  </KPageContainer>

</template>


<script>

  import urls from 'kolibri.urls';
  import { mapState, mapActions } from 'vuex';
  import { UsersExportStatuses } from '../../../constants';
  import DataPageTaskProgress from '../DataPageTaskProgress';

  export default {
    name: 'ImportInterface',
    components: {
      DataPageTaskProgress,
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
            urls['kolibri:kolibri.plugins.facility:download_csv_file'](this.exportUsersFilename),
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
      sectionDescription: 'You can manage users in bulk using spreadsheets.',
      exportCSV: 'Export a CSV file containing all users in the facility:',
      export: 'Export',
      importCSV: 'Add new users and update existing users from a CSV:',
      import: 'Import',
      generatingCSV: 'Generating CSV...',
    },
  };

</script>


<style lang="scss" scoped>

  .generating {
    margin: 8px;
    margin-left: 16px;
  }

</style>
