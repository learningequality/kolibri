<template>

  <KPageContainer>

    <h1>Import and export users</h1>
    <p>
      You can manage users in bulk using spreadsheets.
    </p>
    <p>
      Export a CSV file containing all users in the facility:
    </p>
    <p>
      <KButton
        text="Export"
        appearance="raised-button"
        style="margin: 0;"
        :disabled="isExporting"
        @click="exportCsv"
      />
      <DataPageTaskProgress v-if="isExporting" class="generating">
        Generating CSV...
      </DataPageTaskProgress>
    </p>
    <p>
      Add new users and update existing users from a CSV:
    </p>
    <p>
      <KRouterLink
        text="Import"
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
  };

</script>


<style lang="scss" scoped>

  .generating {
    margin: 8px;
    margin-left: 16px;
  }

</style>
