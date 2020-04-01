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
      <tbody>
        <tr>
          <th>
            {{ $tr('username') }} (USERNAME)
          </th>
          <td>{{ $tr('required') }}</td>
          <td>{{ $tr('usernameValidation') }}</td>
        </tr>
        <tr>
          <th>
            {{ $tr('password') }} (PASSWORD)
          </th>
          <td>{{ $tr('passwordDescription') }}</td>
          <td>{{ $tr('passwordValidation') }}</td>
        </tr>
        <tr>
          <th>
            {{ $tr('fullName') }} (FULL_NAME)
          </th>
          <td>{{ $tr('required') }}</td>
          <td>{{ $tr('fullNameValidation') }}</td>
        </tr>
        <tr>
          <th>
            {{ $tr('userType') }} (USER_TYPE)
          </th>
          <td>{{ $tr('required') }}</td>
          <td>
            <div>{{ $tr('possibleValues') }}</div>
            <ul>
              <li><code>ADMIN</code></li>
              <li><code>COACH</code></li>
              <li><code>ASSIGNABLE_COACH</code></li>
              <li><code>LEARNER</code></li>
            </ul>
          </td>
        </tr>
        <tr>
          <th>
            {{ $tr('identifier') }} (IDENTIFIER)
          </th>
          <td>{{ $tr('optional') }}</td>
          <td>{{ $tr('identifierValidation') }}</td>
        </tr>
        <tr>
          <th>
            {{ $tr('birthYear') }} (BIRTH_YEAR)
          </th>
          <td>{{ $tr('optional') }}</td>
          <td>{{ $tr('yearValidation') }}</td>
        </tr>
        <tr>
          <th>
            {{ $tr('gender') }} (GENDER)
          </th>
          <td>{{ $tr('optional') }}</td>
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
          <th>
            {{ $tr('enrolled') }} (ENROLLED_IN)
          </th>
          <td>{{ $tr('optional') }}</td>
          <td>{{ $tr('listClasses') }}</td>
        </tr>
        <tr>
          <th>
            {{ $tr('assigned') }} (ASSIGNED_TO)
          </th>
          <td>{{ $tr('optional') }}</td>
          <td>{{ $tr('listClasses') }}</td>
        </tr>

      </tbody>
    </table>
  </KModal>
  <!-- eslint-enable max-len -->

</template>


<script>

  export default {
    name: 'InfoModal',
    components: {},
    methods: {
      closeModal() {
        this.$emit('cancel');
      },
    },
    $trs: {
      csvDetails: 'CSV details',
      sectionDescription:
        'A CSV spreadsheet should use the first row as a header. It must contain the following columns in any order:',
      close: 'Close',
      required: 'Required',
      optional: 'Optional',
      usernameValidation:
        'Less than 125 chars and only can contain characters, numbers and underscores',
      passwordDescription: "If it's not provided the system will set it to 'kolibri'",
      passwordValidation: 'At most 128 chars',
      fullNameValidation: 'At most 125 chars',
      possibleValues: 'Possible values:',
      identifierValidation: 'At most 64 chars. Examples: student ID number or email address',
      yearValidation: 'A four-digit number (greater than 1900)',
      listClasses: 'List of class names, separated by commas',
      username: 'Username',
      password: 'Password',
      fullName: 'Full name',
      userType: 'User type',
      identifier: 'Identifier',
      birthYear: 'Birth year',
      gender: 'Gender',
      enrolled: 'Enrolled in',
      assigned: 'Assigned to',
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

</style>
