<template>

  <!-- eslint-disable max-len -->
  <KModal
    :title="$tr('csvDetails')"
    :submitText="coreString('closeAction')"
    size="large"
    @cancel="closeModal"
    @submit="closeModal"
  >
    <p>{{ $tr('sectionDescription') }}</p>

    <table>
      <thead>
        <tr>
          <th>{{ $tr('columnNameHeader') }}</th>
          <th>{{ $tr('columnIDHeader') }}</th>
          <th>{{ $tr('columnInfoHeader') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            {{ $tr('uuid') }}<br >
            <span
              class="label"
              :style="label"
            >{{ $tr('optional') }}</span>
          </td>
          <td><code>UUID</code></td>
          <td>{{ $tr('uuidInfo') }}</td>
        </tr>
        <tr>
          <td>
            {{ $tr('username') }}<br >
            <span
              class="label"
              :style="label"
            >{{ $tr('required') }}</span>
          </td>
          <td><code>USERNAME</code></td>
          <td>{{ $tr('usernameInfo') }}</td>
        </tr>
        <tr>
          <td>
            {{ $tr('password') }}<br >
            <span
              class="label"
              :style="label"
            >{{ $tr('required') }}</span>
          </td>
          <td><code>PASSWORD</code></td>
          <td>{{ $tr('passwordInfo') }} <code>*</code></td>
        </tr>
        <tr>
          <td>
            {{ $tr('fullName') }}<br >
            <span
              class="label"
              :style="label"
            >{{ $tr('required') }}</span>
          </td>
          <td><code>FULL_NAME</code></td>
          <td>{{ $tr('fullNameInfo') }}</td>
        </tr>
        <tr>
          <td>
            {{ $tr('userType') }}<br >
            <span
              class="label"
              :style="label"
            >{{ $tr('required') }}</span>
          </td>
          <td><code>USER_TYPE</code></td>
          <td>
            <div>{{ $tr('possibleValues') }}</div>
            <ul>
              <li><code>ADMIN</code></li>
              <li><code>FACILITY_COACH</code></li>
              <li><code>CLASS_COACH</code></li>
              <li><code>LEARNER</code></li>
            </ul>
          </td>
        </tr>
        <tr>
          <td>
            {{ $tr('identifier') }}<br >
            <span
              class="label"
              :style="label"
            >{{ $tr('optional') }}</span>
          </td>
          <td><code>IDENTIFIER</code></td>
          <td>{{ $tr('identifierInfo') }}</td>
        </tr>
        <tr>
          <td>
            {{ $tr('birthYear') }}<br >
            <span
              class="label"
              :style="label"
            >{{ $tr('optional') }}</span>
          </td>
          <td><code>BIRTH_YEAR</code></td>
          <td>{{ $tr('yearInfo') }}</td>
        </tr>
        <tr>
          <td>
            {{ $tr('gender') }}<br >
            <span
              class="label"
              :style="label"
            >{{ $tr('optional') }}</span>
          </td>
          <td><code>GENDER</code></td>
          <td>
            <div>{{ $tr('possibleValues') }}</div>
            <ul>
              <li><code>MALE</code></li>
              <li><code>FEMALE</code></li>
              <li><code>NOT_SPECIFIED</code></li>
            </ul>
          </td>
        </tr>
        <tr>
          <td>
            {{ $tr('enrolled') }}<br >
            <span
              class="label"
              :style="label"
            >{{ $tr('optional') }}</span>
          </td>
          <td><code>ENROLLED_IN</code></td>
          <td>
            <div>{{ $tr('listClassesEnrolled') }}</div>
            <ul>
              <li>{{ $tr('listClassesEnrolledL1') }}</li>
              <li>{{ $tr('listClassesEnrolledL2') }}</li>
              <li>{{ $tr('listClassesEnrolledL3') }}</li>
            </ul>
          </td>
        </tr>
        <tr>
          <td>
            {{ $tr('assigned') }}<br >
            <span
              class="label"
              :style="label"
            >{{ $tr('optional') }}</span>
          </td>
          <td><code>ASSIGNED_TO</code></td>
          <td>
            <div>{{ $tr('listClassesAssigned') }}</div>
            <ul>
              <li>{{ $tr('listClassesAssignedL1') }}</li>
              <li>{{ $tr('listClassesAssignedL2') }}</li>
              <li>{{ $tr('listClassesAssignedL3') }}</li>
            </ul>
          </td>
        </tr>
      </tbody>
    </table>
  </KModal>
  <!-- eslint-enable max-len -->

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';

  export default {
    name: 'CsvInfoModal',
    mixins: [commonCoreStrings],
    computed: {
      label() {
        return { color: this.$themeTokens.annotation };
      },
    },
    methods: {
      closeModal() {
        this.$emit('cancel');
      },
    },
    $trs: {
      csvDetails: {
        message: 'CSV details',
        context:
          "Title of the spreadsheet format reference window.\n\nCSV is a spreadsheet format that stands for 'Comma-separated values'. More here: https://en.wikipedia.org/wiki/Comma-separated_values",
      },
      sectionDescription: {
        message:
          'A CSV spreadsheet should use the first row as a header, and contain the following columns:',
        context: 'Description on CSV details window.',
      },
      required: {
        message: 'Required',
        context: "Columns in the CSV file can be either 'optional' or 'required'.\n",
      },
      optional: {
        message: 'Optional',
        context: "Columns in the CSV file can be either 'optional' or 'required'.",
      },
      uuidInfo: {
        message:
          'An ID used by Kolibri to uniquely identify a user. Leave it blank to create a new user',
        context:
          "Refers to values in the 'Database ID' column of the CSV (comma separated values) file used to import and export users.\n",
      },
      usernameInfo: {
        message: 'Maximum 125 characters. Can contain letters, numbers and underscores',
        context:
          "Refers to values in the 'Username' column of the CSV (comma separated values) file used to import and export users.",
      },
      passwordInfo: {
        message: 'Maximum 125 characters. To leave unchanged, use an asterisk:',
        context:
          "Refers to values in the 'Password' column of the CSV (comma separated values) file used to import and export users.\n",
      },
      fullNameInfo: {
        message: 'Maximum 125 characters',
        context: 'Description on the spreadsheet format reference window.',
      },
      possibleValues: {
        message: 'Possible values:',
        context:
          'Refers to values the CSV (comma separated values) file used to import and export users.\n',
      },
      identifierInfo: {
        message:
          'Any identifying string, such as a student ID or email address. Maximum 64 characters',
        context: "Description of the 'Identifier' option.",
      },
      yearInfo: {
        message: 'A four-digit year, greater than 1900',
        context:
          "Refers to values in the 'Birth year' column of the CSV (comma separated values) file used to import and export users.\n",
      },
      listClassesEnrolled: {
        message: 'Classes to enroll the user in as a learner:',
        context:
          "Refers to values in the 'Learner enrollment' column of the CSV (comma separated values) file used to import and export users.\n",
      },
      listClassesEnrolledL1: {
        message: 'Can be any type of user',
        context:
          "Refers to values in the 'Learner enrollment' column of the CSV (comma separated values) file used to import and export users.\n",
      },
      listClassesEnrolledL2: {
        message: 'Write the class names separated by commas',
        context:
          'Refers to values in a column of the CSV (comma separated values) file used to import users. When a user is assigned to coach multiple classes, the class names in this field must be separated by commas.',
      },
      listClassesEnrolledL3: {
        message:
          'If an existing class does not match by name, a new class with that name will be created',

        context:
          'Refers to values in a column of the CSV (comma separated values) file used to import users. When a CSV file contains a class name that is not present in the database, import command will create it.',
      },
      listClassesAssigned: {
        message: 'Classes to which the user will be assigned as a coach:',
        context:
          'Description of a column in the CSV (comma separated values) file used to import and export users. Values in this column indicate classes where a coach user will be assigned to.',
      },
      listClassesAssignedL1: {
        message: 'Do not use for learner users',
        context:
          'Refers to values in a column of the CSV (comma separated values) file used to import and export users.',
      },
      listClassesAssignedL2: {
        message: 'List of class names, separated by commas',
        context:
          "Refers to values in the 'Coach assignment' column of the CSV (comma separated values) file used to import and export users.\n",
      },
      listClassesAssignedL3: {
        message: 'If an existing class does not match by name, it will be created',
        context:
          'Explanation that when a CSV file is used to import users and classes they are assigned to, and the CSV file contains a class name that is not already present in a facility, a new class with the name listed in the CSV file will be created.  ',
      },
      columnNameHeader: {
        message: 'Column',
        context:
          'Refers to the title of a type of data on the spreadsheet format reference window.',
      },
      columnIDHeader: {
        message: 'Identifier',
        context:
          "An identifier for a type of data. For example, FULL_NAME is the identifier for 'Full name'.\n\nThis can be used on a spreadsheet.",
      },
      columnInfoHeader: {
        message: 'Information',
        context: 'Title of a column on the spreadsheet format reference window.',
      },
      uuid: {
        message: 'Database ID',
        context:
          "Optional column to be used on a spreadsheet.\n\nUsers see this information by clicking on the 'View spreadsheet format reference' link.\n\nA database ID is an ID used by Kolibri to uniquely identify a user.",
      },
      username: {
        message: 'Username',
        context:
          "Required column to be used on a spreadsheet.\n\nUsers see this information by clicking on the 'View spreadsheet format reference' link.",
      },
      password: {
        message: 'Password',
        context:
          "Required column to be used on a spreadsheet.\n\nUsers see this information by clicking on the 'View spreadsheet format reference' link.",
      },
      fullName: {
        message: 'Full name',
        context:
          "Required column for an imported spreadsheet.\n\nUsers see this information by clicking on the 'View spreadsheet format reference' link.",
      },
      userType: {
        message: 'User type',
        context:
          "Required column to be used on a spreadsheet.\n\nUsers see this information by clicking on the 'View spreadsheet format reference' link.",
      },
      identifier: {
        message: 'Identifier',
        context:
          "Optional column that can be used on an imported spreadsheet.\n\nUsers see this information by clicking on the 'View spreadsheet format reference' link.",
      },
      birthYear: {
        message: 'Birth year',
        context:
          "Optional column that can be used on an imported spreadsheet.\n\nUsers see this information by clicking on the 'View spreadsheet format reference' link.",
      },
      gender: {
        message: 'Gender',
        context:
          "Optional column that can be used on an imported spreadsheet.\n\nUsers see this information by clicking on the 'View spreadsheet format reference' link.",
      },
      enrolled: {
        message: 'Learner enrollment',
        context:
          "Optional column that can be used on an imported spreadsheet.\n\nUsers see this information by clicking on the 'View spreadsheet format reference' link.",
      },
      assigned: {
        message: 'Coach assignment',
        context:
          "Optional column that can be used on an imported spreadsheet.\n\nUsers see this information by clicking on the 'View spreadsheet format reference' link.",
      },
    },
  };

</script>


<style lang="scss" scoped>

  td,
  th {
    padding: 12px 8px;
    line-height: 1.5em;
    text-align: left;
    vertical-align: top;
  }

  .label {
    font-size: smaller;
    font-weight: normal;
  }

  ul {
    margin: 0;
  }

</style>
