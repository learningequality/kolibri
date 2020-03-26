<template>

  <!-- eslint-disable max-len -->
  <div>
    <template v-if="isError">
      <p>Importing is not possible due to the following errors:</p>
      <ul>
        <li v-for="message in this.overall_error">
          {{ message }}
        </li>
      </ul>
    </template>

    <template v-else>
      <template v-if="isFinished">
        <h2 style="color: green;">
          SUCCESS!
        </h2>
        <p>The following changes were made:</p>
      </template>
      <template v-else>
        <p>Summary of changes if you choose to import:</p>
      </template>

      <table class="indent">
        <thead>
          <tr>
            <th></th>
            <th class="numeric">
              Updated
            </th>
            <th class="numeric">
              Added
            </th>
            <th
              v-if="showDeletionCol"
              class="numeric"
            >
              Deleted
            </th>
            <th
              v-if="numSkipped"
              class="numeric"
            >
              Skipped
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Users</td>
            <td class="numeric">
              {{ users_report.updated }}
            </td>
            <td
              class="numeric"
              style="color: green;"
            >
              {{ users_report.created }}
            </td>
            <td
              v-if="showDeletionCol"
              class="numeric"
              style="color: red;"
            >
              {{ users_report.deleted }}
            </td>
            <td
              v-if="numSkipped"
              class="numeric"
            >
              {{ numSkipped }}
            </td>
          </tr>
          <tr>
            <td>Classes</td>
            <td class="numeric">
              {{ classes_report.updated }}
            </td>
            <td
              class="numeric"
              style="color: green;"
            >
              {{ classes_report.created }}
            </td>
            <td
              v-if="showDeletionCol"
              class="numeric"
              style="color: red;"
            >
              {{ classes_report.cleared }}
            </td>
            <td
              v-if="numSkipped"
              class="numeric"
            ></td>
          </tr>
        </tbody>
      </table>

      <template v-if="per_line_errors.length">
        <p v-if="isFinished">
          Some rows were skipped:
        </p>
        <p v-else>
          Some rows have errors and will be skipped if you continue:
        </p>

        <table class="indent">
          <thead>
            <tr>
              <th>Row number</th>
              <th>Column name</th>
              <th>Value</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="obj in per_line_errors">
              <td>{{ obj.row }}</td>
              <td>{{ obj.field }}</td>
              <td>{{ obj.value }}</td>
              <td>{{ obj.message }}</td>
            </tr>
          </tbody>
        </table>
      </template>

    </template>

    <p v-if="isFinished && !isError">
      <KButton
        text="Close"
        appearance="raised-button"
        primary
        @click="$emit('next')"
      />
    </p>
    <p v-else>
      <KButton
        text="Back"
        appearance="raised-button"
        style="margin-left: 0;"
        @click="reset"
      />
      <span v-if="!isError">
        <KButton
          text="Import"
          appearance="raised-button"
          primary
          @click="startSavingUsers"
        />
      </span>
    </p>

  </div>
  <!-- eslint-enable max-len -->

</template>


<script>

  import { mapState, mapActions } from 'vuex';
  import { CSVImportStatuses } from '../../constants';

  export default {
    name: 'Preview',
    computed: {
      isError() {
        return this.status === CSVImportStatuses.ERRORS;
      },
      isFinished() {
        return this.status === CSVImportStatuses.FINISHED;
      },
      showDeletionCol() {
        return this.users_report.deleted || this.classes_report.cleared;
      },
      numSkipped() {
        const skippedLines = new Set();
        this.per_line_errors.forEach(obj => skippedLines.add(obj.row));
        return skippedLines.size;
      },
      ...mapState('importCSV', [
        'overall_error',
        'per_line_errors',
        'classes_report',
        'users_report',
        'status',
      ]),
    },
    methods: {
      ...mapActions('importCSV', ['startSavingUsers']),
      reset() {
        this.$store.commit('importCSV/RESET_STATE');
      },
    },
  };

</script>


<style lang="scss" scoped>

  td,
  th {
    padding: 8px;
    text-align: left;
    vertical-align: top;
  }

  .numeric {
    text-align: right;
  }

  th {
    font-size: small;
    font-weight: bold;
    color: gray;
  }

  .indent {
    margin-left: 16px;
  }

</style>
