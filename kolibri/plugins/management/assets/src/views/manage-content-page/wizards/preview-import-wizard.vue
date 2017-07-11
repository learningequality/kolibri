<template>

  <core-modal
    :title="$tr('title')"
    :enableBgClickCancel="false"
    @cancel="cancel"
    @enter="submit"
  >
    <div>

      <!-- LOCAL IMPORT PREVIEW -->
      <div v-if="importSource === 'local'">
        <p>{{ localImportPrompt }}</p>

        <ul class="channel-list">
          <li v-for="(channel, i) in channelList" :key="i" >
            {{ channel.name }}
          </li>
        </ul>
      </div>

      <!-- REMOTE IMPORT PREVIEW -->

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
    computed: {
      localImportPrompt() {
        return this.$tr('localImportPrompt', {
          numChannels: this.channelList.length,
          driveName: this.sourceMeta.driveName
        })
      },
      importSource() {
        if (this.sourceMeta.driveId !== undefined) {
          return "local";
        }
        return "remote";
      },
      channelList() {
        return this.sourceMeta.channelList;
      },
    },
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
        sourceMeta: state => state.pageState.wizardState.meta,
      },
      actions: {
        transitionWizardPage,
      }
    },
    $trNameSpace: "previewImportWizard",
    $trs: {
      cancelButtonLabel: "Cancel",
      confirmButtonLabel: "Import",
      localImportPrompt: 'You are about to import {numChannels, number} {numChannels, plural, one {Channel} other {Channels}} on {driveName}',
      localImportTitle: "Import from local drive",
      remoteImporttitle: "Import from internet",
      title: "Import from local drive",
    }
  };
</script>


<style lang="stylus" scoped>

  .button-wrapper
    margin: 1em 0
    text-align: center

  .channel-list
    list-style: none
    padding-left: 0

  .channel-list li
    margin: 1rem 0


</style>
