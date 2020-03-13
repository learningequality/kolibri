<template>

  <KPageContainer>

    <h1>{{ $tr('pageHeader') }}</h1>

    <template v-if="state === 'INIT'">

      <p>
        When importing from a spreadsheet you can create, update, and optionally delete dozens or hundreds of facility users at one time by loading new information from comma-separated-value (CSV) files.
      </p>
      <p>
        <KButton
          appearance="basic-link"
          text="View spreadsheet format reference"
          @click="showInfoModal = true"
        />
      </p>
      <p class="caution">
        CAUTION: importing from CSV will make many changes to your users and classes, and these changes cannot be easily reverted.
      </p>
      <p>Importing from CSV will:</p>
      <ul>
        <li>create new users</li>
        <li>update existing users (for users with matching usernames)</li>
        <li>set which classes each learner is enrolled in</li>
        <li>set which classes each coach is assigned to</li>
        <li>create new classes (for any referenced class names that do not yet exist)</li>
      </ul>
      <p>Optionally, you can also delete users and classes that are not referenced in the spreadsheet.</p>
      <p>
        Before committing to the import you will be shown a summary of changes that will be made, but it's very important to use this feature carefully.
      </p>
      <p>
        <label for="csv-file">To proceed, select a CSV file:</label>
      </p>
      <p>
        <input
          id="csv-file"
          ref="fileInput"
          type="file"
          accept=".csv"
          name="csv-file"
          @change="filesChanged"
        >
      </p>
      <KButton
        text="Next"
        appearance="raised-button"
        :disabled="fileToImport === null"
        style="margin: 0;"
        primary
        @click="preview"
      />

      <InfoModal
        v-if="showInfoModal"
        @cancel="showInfoModal = false"
      />

    </template>


    <template v-else-if="state === 'IN_PROGRESS'">

      <p>
        <KCircularLoader style="display: inline-block;" />
      </p>

    </template>

    <template v-else-if="state === 'PREVIEW'">

      <h2>Preview</h2>

      ...

      Possible states that will be passed back to the frontend:
      initial: loading_csv
      no csv.reader error .... validate csv
      no csv validation error .... validate_users using full_clean()
      no users validation error .... create users using bulk_create()
      no db error .... validate classes
      no classes validation error .... create classes
      no create classes error .... assign users to classes

    </template>


  </KPageContainer>

</template>


<script>

  import InfoModal from './InfoModal';

  export default {
    name: 'ImportCsvPage',
    metaInfo() {
      return {
        title: this.$tr('pageHeader'),
      };
    },
    components: {
      InfoModal,
    },
    data() {
      return {
        showInfoModal: false,
        state: 'INIT',
        fileToImport: null,
      };
    },
    methods: {
      filesChanged() {
        if (this.$refs.fileInput.files.length) {
          this.fileToImport = this.$refs.fileInput.files[0];
        } else {
          this.fileToImport = null;
        }
        console.log(this.fileToImport);
      },
      preview() {
        this.state = 'IN_PROGRESS';
        setTimeout(() => {
          this.state = 'PREVIEW';
        }, 2000);
      },
    },
    $trs: {
      pageHeader: 'Import users from spreadsheet',
    },
  };

</script>


<style lang="scss" scoped>

  .caution {
    font-weight: bold;
    color: red;
  }

</style>
