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
        :disabled="exporting"
        @click="exportCsv"
      />
      <DataPageTaskProgress v-if="exporting" class="generating">
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

  import * as csvGenerator from 'csv-generator-client'; // temporarily used for mockups
  import DataPageTaskProgress from '../DataPageTaskProgress';

  // temporarily used for mockups
  function dummyExport() {
    const COLS = [
      'Username',
      'Password',
      'Full name',
      'User type',
      'Identifier',
      'Birth year',
      'Gender',
      'Enrolled in',
      'Assigned to',
    ];
    csvGenerator.download({
      fileName: 'users.csv',
      dataArray: [
        COLS,
        [
          'teach4life',
          'password123',
          'Mr Jones',
          'FACILITY_COACH',
          '',
          1975,
          'NOT_SPECIFIED',
          'Algebra 1, Geometry',
        ],
        ['student4now', '', 'Alice', 'LEARNER', 'ABC123', 2008, 'MALE', '', 'Geometry'],
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
