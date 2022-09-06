<template>

  <div>
    <h1>{{ $tr('documentTitle') }}</h1>
    <p>{{ $tr('confirmMergeInfoLine') }}</p>
    <div class="confirm">
      <KCheckbox
        ref="kCheckbox"
        :label="$tr('consequences')"
        :checked="false"
        @change="isConfirmed = !isConfirmed"
        @keydown.enter="handleContinue"
      />
    </div>

    <BottomAppBar>
      <slot name="buttons">
        <KButtonGroup>
          <KButton
            :primary="false"
            :text="coreString('backAction')"
            appearance="flat-button"
            data-test="backButton"
            @click="sendBack"
          />
          <KButton
            :primary="true"
            :disabled="!isConfirmed"
            :text="coreString('continueAction')"
            data-test="continueButton"
            @click="handleContinue"
          />
        </KButtonGroup>
      </slot>
    </BottomAppBar>

  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import BottomAppBar from 'kolibri.coreVue.components.BottomAppBar';
  import { inject, ref } from 'kolibri.lib.vueCompositionApi';

  export default {
    name: 'ConfirmMerge',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: { BottomAppBar },

    mixins: [commonCoreStrings],

    setup() {
      const changeFacilityService = inject('changeFacilityService');
      const isConfirmed = ref(false);

      function handleContinue() {
        if (isConfirmed.value) {
          changeFacilityService.send({
            type: 'CONTINUE',
          });
        }
      }
      function sendBack() {
        changeFacilityService.send({
          type: 'BACK',
        });
      }
      return {
        isConfirmed,
        sendBack,
        handleContinue,
      };
    },

    $trs: {
      documentTitle: {
        message: 'Merge accounts',
        context: 'Title of this step for the change facility page.',
      },
      confirmMergeInfoLine: {
        message:
          'You are about to merge all progress data from two different accounts. Progress data includes your interactions with resources, time spent, and points. This cannot be undone.',
        context: 'Text explaining the consequences merging will have.',
      },
      consequences: {
        message: 'I understand the consequences of merging accounts',
        context: 'Button to confirm the acceptance of merging.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .confirm {
    margin-top: 40px;
  }

</style>
