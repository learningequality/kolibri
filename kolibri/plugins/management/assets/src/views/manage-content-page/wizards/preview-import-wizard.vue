<template>

  <core-modal
    :title="$tr('title')"
    :error="wizardState.error ? true : false"
    :enableBgClickCancel="false"
    @cancel="cancel"
    @enter="submit"
  >
    <div>
      <div>
          Preview Stuff
          {{ importSource }}
      </div>

      <div class="button-wrapper">
        <icon-button @click="cancel" :text="$tr('cancelButtonLabel')" />
        <icon-button
          :text="$tr('confirmButtonLabel')"
          @click="submit"
          :primary="true"
        />
      </div>
    </div>

  </core-modal>

</template>


<script>
  import coreModal from "kolibri.coreVue.components.coreModal";
  import iconButton from "kolibri.coreVue.components.iconButton";
  import { transitionWizardPage } from "../../../state/manageContentActions";

  export default {
    components: {
      coreModal,
      iconButton
    },
    computed: {},
    methods: {
      cancel() {
        this.transitionWizardPage("cancel");
      },
      submit() {
        // if meta.driveId, then it is a local import
        // if meta.channelId, then it is a remote import
      }
    },
    vuex: {
      getters: {
        wizardState: state => state.pageState.wizardState,
        importSource(state) {
          if (state.pageState.wizardState.meta.driveId !== undefined) {
            return "local";
          }
          return "remote";
        }
      },
      actions: {
        transitionWizardPage,
      }
    },
    $trNameSpace: "previewImportWizard",
    $trs: {
      title: "Import from local drive",
      localImportTitle: "Import from local drive",
      remoteImporttitle: "Import from internet",
      confirmButtonLabel: "Import",
      cancelButtonLabel: "Cancel"
    }
  };
</script>


<style lang="stylus" scoped>

  .button-wrapper
    margin: 1em 0
    text-align: center

</style>
