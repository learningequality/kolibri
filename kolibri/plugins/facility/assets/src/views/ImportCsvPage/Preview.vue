<template>

  <!-- eslint-disable max-len -->
  <div>
    <template v-if="isError">
      <p>{{ $tr('importError') }}</p>
      <ul>
        <li v-for="(message, index) in overall_error" :key="index">
          {{ message }}
        </li>
      </ul>
    </template>

    <template v-else>
      <p v-if="isFinished">
        {{ $tr('changesMade') }}
      </p>
      <p v-else>
        {{ $tr('summary') }}
      </p>

      <table class="indent">
        <thead>
          <tr>
            <th></th>
            <th class="numeric">
              {{ $tr('updated') }}
            </th>
            <th class="numeric">
              {{ $tr('added') }}
            </th>
            <th
              v-if="showDeletionCol"
              class="numeric"
            >
              {{ $tr('deleted') }}
            </th>
            <th
              v-if="numSkipped"
              class="numeric"
            >
              {{ $tr('skipped') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{{ $tr('users') }}</td>
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
            <td>{{ $tr('classes') }}</td>
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
          {{ $tr('someSkipped') }}
        </p>
        <p v-else>
          {{ $tr('someRowErrors') }}
        </p>

        <table class="indent">
          <thead>
            <tr>
              <th>{{ $tr('rowNumber') }}</th>
              <th>{{ $tr('columnName') }}</th>
              <th>{{ $tr('value') }}</th>
              <th>{{ $tr('error') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(obj, index) in per_line_errors" :key="index">
              <td>{{ obj.row }}</td>
              <td>{{ obj.field }}</td>
              <td>{{ obj.value }}</td>
              <td>{{ obj.message }}</td>
            </tr>
          </tbody>
        </table>
      </template>

    </template>

    <template v-if="isFinished && !isError">
      <UiAlert :dismissible="false" type="success" style="margin-top: 16px;">
        {{ $tr('success') }}
      </UiAlert>
      <p>
        <KButton
          :text="$tr('close')"
          appearance="raised-button"
          primary
          @click="$emit('done')"
        />
      </p>
    </template>
    <p v-else>
      <KButtonGroup>
        <KButton
          :text="$tr('back')"
          appearance="raised-button"
          style="margin-left: 0;"
          @click="reset"
        />
        <KButton
          v-if="!isError & hasChanges"
          :text="$tr('import')"
          appearance="raised-button"
          primary
          @click="startSavingUsers"
        />
      </KButtonGroup>
    </p>

  </div>
  <!-- eslint-enable max-len -->

</template>


<script>

  import { mapState, mapActions } from 'vuex';
  import UiAlert from 'kolibri-design-system/lib/keen/UiAlert';
  import { CSVImportStatuses } from '../../constants';

  export default {
    name: 'Preview',
    components: {
      UiAlert,
    },
    computed: {
      isError() {
        return this.status === CSVImportStatuses.ERRORS;
      },
      hasChanges() {
        const classes_changes = Object.values(this.classes_report).reduce((a, b) => a + b, 0);
        const user_changes = Object.values(this.users_report).reduce((a, b) => a + b, 0);
        return classes_changes + user_changes != 0;
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
    $trs: {
      importError: 'Importing is not possible due to the following errors:',
      success: 'The import succeeded',
      changesMade: 'The following changes were made:',
      summary: 'Summary of changes if you choose to import:',
      updated: 'Updated',
      added: 'Added',
      deleted: 'Deleted',
      skipped: {
        message: 'Skipped',
        context: 'Refers to rows in the CSV file.\n\n',
      },
      users: 'Users',
      classes: 'Classes',
      someSkipped: 'These rows were skipped:',
      someRowErrors: 'These rows have errors and will be skipped if you continue:',
      rowNumber: 'Row number',
      columnName: 'Column name',
      value: 'Value',
      error: 'Error',
      close: 'Close',
      back: 'Back',
      import: 'Import',
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
