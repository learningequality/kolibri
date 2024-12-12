<template>

  <div>
    <h1>{{ profileString('mergeAccounts') }}</h1>
    <p>{{ $tr('confirmMergeInfoLine') }}</p>
    <div class="confirm">
      <KCheckbox
        ref="kCheckbox"
        :label="$tr('consequences')"
        :checked="isConfirmed"
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

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import BottomAppBar from 'kolibri/components/BottomAppBar';
  import { inject, ref } from 'vue';
  import commonProfileStrings from '../commonProfileStrings';

  export default {
    name: 'ConfirmMerge',
    metaInfo() {
      return {
        title: this.profileString('mergeAccounts'),
      };
    },
    components: { BottomAppBar },

    mixins: [commonCoreStrings, commonProfileStrings],

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
      confirmMergeInfoLine: {
        message:
          'You are about to merge two accounts and their progress data. Progress data includes your interactions with resources, time spent, and points. This cannot be undone.',
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
