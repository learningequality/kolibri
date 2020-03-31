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
      :style="{color: $themeTokens.error}"
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
    <p>
      <KCheckbox :label="$tr('labelDelete')" @change="toggleDelete" />
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
        @click="$emit('next', fileToImport, deleteUsers)"
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
      introduction:
        'When importing from a spreadsheet you can create, update, and optionally delete dozens or hundreds of facility users at a time by loading new information from comma-separated-value (CSV) files.',
      caution:
        'CAUTION: importing from CSV will make many changes to your users and classes, and these changes cannot be easily reverted.',
      viewFormat: 'View spreadsheet format reference',
      importingWill: 'Importing from CSV will:',
      importL1: 'create new users',
      importL2: 'update existing users (for users with matching usernames)',
      importL3: 'set which classes each learner is enrolled in',
      importL4: 'set which classes each coach is assigned to',
      importL5: 'create new classes (for any referenced class names that do not yet exist)',
      optionally:
        'Optionally, you can also delete users and classes that are not referenced in the spreadsheet.',
      proceed: 'To proceed, select a CSV file:',
      beforeCommitting:
        'Before committing the import you will be shown a summary of changes that will be made.',
      labelDelete: 'Also delete users and classes not in CSV',
    },
  };

</script>


<style lang="scss" scoped>

  .caution {
    font-weight: bold;
  }

</style>
