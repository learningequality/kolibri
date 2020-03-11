<template>

  <KPageContainer>

    <h1>CSV import/export</h1>
    <p>
      Comma-separated-value (.csv) files are a plain-text format for storing tabular data.
    </p>
    <p>
      Add new users and update existing users:
    </p>
    <p>
      <KRouterLink
        text="Import"
        appearance="raised-button"
        :to="$router.getRoute('IMPORT_CSV_PAGE')"
        style="margin: 0;"
      />
    </p>
    <p>
      Export a CSV file containing all users in the facility:
    </p>
    <p>
      <KButton
        text="Export"
        appearance="raised-button"
        style="margin: 0;"
        :disabled="exporting"
        @click="exportCsv"
      />
      <DataPageTaskProgress v-if="exporting" class="generating">
        Generating CSV...
      </DataPageTaskProgress>
    </p>

    <InfoModal
      v-if="modalShown"
      @cancel="modalShown = false"
    />

  </KPageContainer>

</template>


<script>

  import * as csvGenerator from 'csv-generator-client'; // temporarily used for mockups
  import DataPageTaskProgress from '../DataPageTaskProgress';
  import InfoModal from './InfoModal';

  // temporarily used for mockups
  function dummyExport() {
    const COLS = ['Username', 'Full name', 'User type', 'Birth year', 'Enrolled in', 'Assigned to'];
    csvGenerator.download({
      fileName: 'users.csv',
      dataArray: [
        COLS,
        ['teach4life', 'Mr Jones', 'FACILITY_COACH', 1975, '', 'Algebra 1, Geometry'],
        ['student4now', 'Alice', 'LEARNER', 2008, 'Geometry', ''],
      ],
      settings: {
        separator: ',',
        addQuotes: true,
        autoDetectColumns: false,
        columnKeys: COLS,
      },
    });
  }

  export default {
    name: 'ImportInterface',
    components: {
      DataPageTaskProgress,
      InfoModal,
    },
    data: () => ({
      modalShown: false,
      exporting: false,
    }),
    methods: {
      exportCsv() {
        // Trigger export task.
        // If the user is on this page when the task completes, download the file.
        // Otherwise, it's discarded.
        this.exporting = true;
        setTimeout(() => {
          this.exporting = false;
          dummyExport();
        }, 2000);
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
