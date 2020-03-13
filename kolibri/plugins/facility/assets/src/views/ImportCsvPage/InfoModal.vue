<template>

  <KModal
    :title="$tr('csvDetails')"
    :submitText="$tr('close')"
    size="large"
    @cancel="closeModal"
    @submit="closeModal"
  >
    <p>A CSV spreadsheet should use the first row as a header. It must contain the following columns in order:</p>

    <table>
      <tbody>
        <tr>
          <th>
            Username
          </th>
          <td>Required</td>
          <td>(details)</td>
        </tr>
        <tr>
          <th>
            Password
          </th>
          <td>Required</td>
          <td>(details)</td>
        </tr>
        <tr>
          <th>
            Full name
          </th>
          <td>Required</td>
          <td>(details)</td>
        </tr>
        <tr>
          <th>
            User type
          </th>
          <td>Required</td>
          <td>
            <div>Possible values:</div>
            <ul>
              <li>Admin</li>
              <li>Facility coach</li>
              <li>Class coach</li>
              <li>Learner</li>
            </ul>
          </td>
        </tr>
        <tr>
          <th>
            Identifier
          </th>
          <td>Optional</td>
          <td>(details)</td>
        </tr>
        <tr>
          <th>
            Birth year
          </th>
          <td>Optional</td>
          <td>(details)</td>
        </tr>
        <tr>
          <th>
            Gender
          </th>
          <td>Optional</td>
          <td>
            <div>Possible values:</div>
            <ul>
              <li>Male</li>
              <li>Female</li>
              <li>Not specified</li>
            </ul>
          </td>
        </tr>
        <tr>
          <th>
            Enrolled in
          </th>
          <td>Optional</td>
          <td>List of class names, separated by commas</td>
        </tr>
        <tr>
          <th>
            Assigned to
          </th>
          <td>Optional</td>
          <td>List of class names, separated by commas</td>
        </tr>

      </tbody>
    </table>
  </KModal>

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
      close: 'Close',
    },
  };

</script>


<style lang="scss" scoped>

  td,
  th {
    padding: 12px 8px;
    line-height: 1.5em;
    vertical-align: top;
  }

</style>
