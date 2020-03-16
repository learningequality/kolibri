<template>

  <!-- eslint-disable max-len -->
  <div>

    <p>
      When importing from a spreadsheet you can create, update, and optionally delete dozens or hundreds of facility users at a time by loading new information from comma-separated-value (CSV) files.
    </p>
    <p>
      <KButton
        appearance="basic-link"
        text="View spreadsheet format reference"
        @click="showInfoModal = true"
      />
    </p>
    <p
      class="caution"
      :style="{color: $themeTokens.error}"
    >
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
    <p>
      Optionally, you can also delete users and classes that are not referenced in the spreadsheet.
    </p>
    <p>
      Before committing the import you will be shown a summary of changes that will be made.
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
    <p>
      <KCheckbox label="Also delete users and classes not in CSV" />
    </p>
    <p>
      <KButton
        text="Cancel"
        appearance="raised-button"
        style="margin-left: 0;"
        @click="$emit('cancel')"
      />
      <KButton
        text="Next"
        appearance="raised-button"
        :disabled="fileToImport === null"
        primary
        @click="$emit('next', fileToImport)"
      />
    </p>

    <InfoModal
      v-if="showInfoModal"
      @cancel="showInfoModal = false"
    />

  </div>
  <!-- eslint-enable max-len -->

</template>


<script>

  import InfoModal from './InfoModal';

  export default {
    name: 'Init',
    components: {
      InfoModal,
    },
    data() {
      return {
        showInfoModal: false,
        fileToImport: null,
      };
    },
    methods: {
      filesChanged() {
        if (this.$refs.fileInput && this.$refs.fileInput.files.length) {
          this.fileToImport = this.$refs.fileInput.files[0];
        } else {
          this.fileToImport = null;
        }
      },
    },
  };

</script>


<style lang="scss" scoped>

  .caution {
    font-weight: bold;
  }

</style>
