<template>

  <!-- eslint-disable max-len -->
  <div>
    <p>
      {{ $tr('introduction') }}
    </p>
    <p>
      <KButton
        appearance="basic-link"
        :text="$tr('viewFormat')"
        @click="showInfoModal = true"
      />
    </p>
    <p
      class="caution"
      :style="{ color: $themeTokens.error }"
    >
      {{ $tr('caution') }}
    </p>
    <p>{{ $tr('importingWill') }}</p>
    <ul>
      <li>{{ $tr('importL1') }}</li>
      <li>{{ $tr('importL2') }}</li>
      <li>{{ $tr('importL3') }}</li>
      <li>{{ $tr('importL4') }}</li>
      <li>{{ $tr('importL5') }}</li>
    </ul>
    <p>
      {{ $tr('optionally') }}
    </p>
    <p>
      {{ $tr('beforeCommitting') }}
    </p>
    <p>
      <label for="csv-file"> {{ $tr('proceed') }}</label>
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
    <!-- Temporarily remove this functionality for MVP -->
    <p v-if="false">
      <KCheckbox
        :label="$tr('labelDelete')"
        @change="toggleDelete"
      />
    </p>
    <p>
      <KButtonGroup>
        <KButton
          :text="coreString('cancelAction')"
          appearance="raised-button"
          style="margin-left: 0"
          @click="$emit('cancel')"
        />
        <KButton
          :text="coreString('continueAction')"
          appearance="raised-button"
          :disabled="fileToImport === null"
          primary
          @click="$emit('next', fileToImport, deleteUsers)"
        />
      </KButtonGroup>
    </p>

    <CsvInfoModal
      v-if="showInfoModal"
      @cancel="showInfoModal = false"
    />
  </div>
  <!-- eslint-enable max-len -->

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import CsvInfoModal from '../CsvInfoModal';

  export default {
    name: 'Init',
    components: {
      CsvInfoModal,
    },
    mixins: [commonCoreStrings],
    data() {
      return {
        showInfoModal: false,
        fileToImport: null,
        deleteUsers: false,
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
      toggleDelete() {
        this.deleteUsers = !this.deleteUsers;
      },
    },
    $trs: {
      introduction: {
        message:
          'When importing from a spreadsheet you can create, update, and optionally delete dozens or hundreds of facility users at a time by loading new information from comma-separated-value (CSV) files.',
        context: "Description on 'Import users' page.",
      },
      caution: {
        message:
          'CAUTION: importing from CSV will make many changes to your users and classes, and these changes cannot be easily reverted.',
        context: "Warning message on 'Import users' page.",
      },
      viewFormat: {
        message: 'View spreadsheet format reference',
        context:
          'Link to the spreadsheet format reference doc which tells user how a CSV file should be formatted.',
      },
      importingWill: {
        message: 'Importing from CSV will:',
        context: "Description on 'Import users' page.",
      },
      importL1: {
        message: 'create new users',
        context: "Description on 'Import users' page.",
      },
      importL2: {
        message: 'update existing users (for users with matching usernames)',
        context: "Description on 'Import users' page.",
      },
      importL3: {
        message: 'set which classes each learner is enrolled in',
        context: "Description on 'Import users' page.",
      },
      importL4: {
        message: 'set which classes each coach is assigned to',
        context: "Description on 'Import users' page.",
      },
      importL5: {
        message: 'create new classes (for any referenced class names that do not yet exist)',
        context: "Description on 'Import users' page.",
      },
      optionally: {
        message:
          'Optionally, you can also delete users and classes that are not referenced in the spreadsheet.',
        context: "Description on 'Import users' page.",
      },
      proceed: {
        message: 'To proceed, select a CSV file:',
        context: "Description on 'Import users' page.\n",
      },
      beforeCommitting: {
        message:
          'Before committing the import you will be shown a summary of changes that will be made.',
        context: "Description on 'Import users' page.",
      },
      labelDelete: {
        message: 'Also delete users and classes not in CSV',
        context:
          'Option to allow user to delete users and classes that are not referenced in the spreadsheet.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .caution {
    font-weight: bold;
  }

</style>
