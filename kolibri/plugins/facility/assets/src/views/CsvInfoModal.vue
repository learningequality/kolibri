<template>

  <!-- eslint-disable max-len -->
  <KModal
    :title="$tr('csvDetails')"
    :submitText="$tr('close')"
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
            {{ $tr('uuid') }}<br>
            <span class="label" :style="label">{{ $tr('optional') }}</span>
          </td>
          <td><code>UUID</code></td>
          <td>{{ $tr('uuidInfo') }}</td>
        </tr>
        <tr>
          <td>
            {{ $tr('username') }}<br>
            <span class="label" :style="label">{{ $tr('required') }}</span>
          </td>
          <td><code>USERNAME</code></td>
          <td>{{ $tr('usernameInfo') }}</td>
        </tr>
        <tr>
          <td>
            {{ $tr('password') }}<br>
            <span class="label" :style="label">{{ $tr('required') }}</span>
          </td>
          <td><code>PASSWORD</code></td>
          <td>{{ $tr('passwordInfo') }} <code>*</code></td>
        </tr>
        <tr>
          <td>
            {{ $tr('fullName') }}<br>
            <span class="label" :style="label">{{ $tr('required') }}</span>
          </td>
          <td><code>FULL_NAME</code></td>
          <td>{{ $tr('fullNameInfo') }}</td>
        </tr>
        <tr>
          <td>
            {{ $tr('userType') }}<br>
            <span class="label" :style="label">{{ $tr('required') }}</span>
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
            {{ $tr('identifier') }}<br>
            <span class="label" :style="label">{{ $tr('optional') }}</span>
          </td>
          <td><code>IDENTIFIER</code></td>
          <td>{{ $tr('identifierInfo') }}</td>
        </tr>
        <tr>
          <td>
            {{ $tr('birthYear') }}<br>
            <span class="label" :style="label">{{ $tr('optional') }}</span>
          </td>
          <td><code>BIRTH_YEAR</code></td>
          <td>{{ $tr('yearInfo') }}</td>
        </tr>
        <tr>
          <td>
            {{ $tr('gender') }}<br>
            <span class="label" :style="label">{{ $tr('optional') }}</span>
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
            {{ $tr('enrolled') }}<br>
            <span class="label" :style="label">{{ $tr('optional') }}</span>
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
            {{ $tr('assigned') }}<br>
            <span class="label" :style="label">{{ $tr('optional') }}</span>
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

  export default {
    name: 'CsvInfoModal',
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
      csvDetails: 'CSV details',
      sectionDescription:
        'A CSV spreadsheet should use the first row as a header, and contain the following columns:',
      close: 'Close',
      required: 'Required',
      optional: 'Optional',
      uuidInfo:
        'An ID used by Kolibri to uniquely identify a user. Leave it blank to create a new user',
      usernameInfo: 'Maximum 125 characters. Can contain letters, numbers and underscores',
      passwordInfo: 'Maximum 125 characters. To leave unchanged, use an asterisk:',
      fullNameInfo: 'Maximum 125 characters',
      possibleValues: 'Possible values:',
      identifierInfo:
        'Any identifying string, such as a student ID or email address. Maximum 64 characters',
      yearInfo: 'A four-digit year, greater than 1900',
      listClassesEnrolled: 'Classes to enroll the user in as a learner:',
      listClassesEnrolledL1: 'Can be any type of user',
      listClassesEnrolledL2: 'Write the class names separated by commas',
      listClassesEnrolledL3:
        'If an existing class does not match by name, a new class with that name will be created',
      listClassesAssigned: {
        message: 'Classes to which the user will be assigned as a coach:',
        context:
          'Description of a column in the CSV (comma separated values) file used to import and export users. Values in this column indicate classes where a coach user will be assigned to.',
      },
      listClassesAssignedL1: 'Do not use for learner users',
      listClassesAssignedL2: 'List of class names, separated by commas',
      listClassesAssignedL3: 'If an existing class does not match by name, it will be created',
      columnNameHeader: 'Column',
      columnIDHeader: 'Identifier',
      columnInfoHeader: 'Information',
      uuid: 'Database ID',
      username: 'Username',
      password: 'Password',
      fullName: 'Full name',
      userType: 'User type',
      identifier: 'Identifier',
      birthYear: 'Birth year',
      gender: 'Gender',
      enrolled: 'Learner enrollment',
      assigned: 'Coach assignment',
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
