<template>

  <!-- eslint-disable max-len -->
  <div>
    <template v-if="isError">
      <p>{{ $tr('importError') }}</p>
      <ul>
        <li
          v-for="(message, index) in overall_error"
          :key="index"
        >
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
            <th
              class="numeric"
              :style="{ color: $themeTokens.annotation }"
            >
              {{ $tr('updated') }}
            </th>
            <th
              class="numeric"
              :style="{ color: $themeTokens.annotation }"
            >
              {{ $tr('added') }}
            </th>
            <th
              v-if="showDeletionCol"
              class="numeric"
              :style="{ color: $themeTokens.annotation }"
            >
              {{ $tr('deleted') }}
            </th>
            <th
              v-if="numSkipped"
              class="numeric"
              :style="{ color: $themeTokens.annotation }"
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
              :style="{ color: $themePalette.green.v_600 }"
            >
              {{ users_report.created }}
            </td>
            <td
              v-if="showDeletionCol"
              class="numeric"
              :style="{ color: $themePalette.red.v_a700 }"
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
              :style="{ color: $themePalette.green.v_600 }"
            >
              {{ classes_report.created }}
            </td>
            <td
              v-if="showDeletionCol"
              class="numeric"
              :style="{ color: $themePalette.red.v_a700 }"
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
              <th :style="{ color: $themeTokens.annotation }">
                {{ $tr('rowNumber') }}
              </th>
              <th :style="{ color: $themeTokens.annotation }">
                {{ $tr('columnName') }}
              </th>
              <th :style="{ color: $themeTokens.annotation }">
                {{ $tr('value') }}
              </th>
              <th :style="{ color: $themeTokens.annotation }">
                {{ $tr('error') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(obj, index) in per_line_errors"
              :key="index"
            >
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
      <UiAlert
        :dismissible="false"
        type="success"
        style="margin-top: 16px"
      >
        {{ $tr('success') }}
      </UiAlert>
      <p>
        <KButton
          :text="coreString('closeAction')"
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
          style="margin-left: 0"
          @click="reset"
        />
        <KButton
          v-if="!isError && hasChanges"
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
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { CSVImportStatuses } from '../../constants';

  export default {
    name: 'Preview',
    components: {
      UiAlert,
    },
    mixins: [commonCoreStrings],
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
      importError: {
        message: 'Importing is not possible due to the following errors:',
        context: 'Error message that displays when the import CSV functionality fails.',
      },
      success: {
        message: 'The import succeeded',
        context: 'Success notification when import CSV works correctly.',
      },
      changesMade: {
        message: 'The following changes were made:',
        context: 'Heading for the outcome report for the import from CSV operation.',
      },
      summary: {
        message: 'Summary of changes if you choose to import:',
        context: "Description on the 'Import users' preview page.",
      },
      updated: {
        message: 'Updated',
        context:
          'Indicates elements like users or classes that will be updated if the CSV import is completed.',
      },
      added: {
        message: 'Added',
        context:
          "Refers to elements like users or classes 'added' when importing a CSV file. This displays on the 'Import users' preview screen so the user can see the changes before confirming the import.",
      },
      deleted: {
        message: 'Deleted',
        context:
          "Refers to elements like users or classes 'deleted' when importing a CSV file. This displays on the 'Import users' preview screen so the user can see the changes before confirming the import.",
      },
      skipped: {
        message: 'Skipped',
        context: 'Refers to rows in the CSV file.\n\n',
      },
      users: {
        message: 'Users',
        context: 'Refers to the users being updated with the CSV import.',
      },
      classes: {
        message: 'Classes',
        context: 'Refers to the summary of changes in classes produced by a CSV import.',
      },
      someSkipped: {
        message: 'These rows were skipped:',
        context:
          'During the import operation of users and classes from the CSV file, some rows may be skipped because of improper formatting.',
      },
      someRowErrors: {
        message: 'These rows have errors and will be skipped if you continue:',
        context:
          'During the import operation of users and classes from the CSV file, some rows may be skipped because of improper formatting.',
      },
      rowNumber: {
        message: 'Row number',
        context: 'Refers to rows in the CSV file.\n',
      },
      columnName: {
        message: 'Column name',
        context: 'Refers to an element in the CSV file.',
      },
      value: {
        message: 'Value',
        context:
          'Refers to values the CSV (comma separated values) file used to import and export users. A value could be a number or a string. The value is the representation of some entity that can be manipulated by the CSV file.',
      },
      error: {
        message: 'Error',
        context: 'Title of error message in the CSV file.',
      },
      back: {
        message: 'Back',
        context:
          "Option to go 'back' on the 'Import users' preview screen if the user decides not to continue with the import.",
      },
      import: {
        message: 'Import',
        context: 'Refers to importing CSV files.',
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
  }

  .indent {
    margin-left: 16px;
  }

</style>
