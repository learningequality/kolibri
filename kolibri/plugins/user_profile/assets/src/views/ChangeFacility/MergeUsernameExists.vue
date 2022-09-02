<template>

  <div>
    <h1>{{ $tr('documentTitle') }}</h1>
    <p data-test="line1">
      {{ mergeAccountInfoLine1 }}
    </p>
    <p data-test="line2">
      {{ mergeAccountInfoLine2 }}
    </p>

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
  import { computed, inject } from 'kolibri.lib.vueCompositionApi';
  import get from 'lodash/get';

  export default {
    name: 'MergeUsernameExists',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: { BottomAppBar },

    mixins: [commonCoreStrings],

    setup(_, context) {
      const changeFacilityService = inject('changeFacilityService');
      const state = inject('state');
      const store =
        context.root.$store !== undefined ? context.root.$store : context.root.$children[0].$store;
      const session = store.getters['session'];
      const username = computed(() => session.username);
      const mergeAccountInfoLine1 = computed({
        get() {
          return this.$tr('confirmMergeInfoLine1', {
            target_facility: get(state, 'value.targetFacility.name', ''),
            username: username.value,
          });
        },
      });
      const mergeAccountInfoLine2 = computed({
        get() {
          return this.$tr('confirmMergeInfoLine2', {
            target_facility: get(state, 'value.targetFacility.name', ''),
          });
        },
      });

      function handleContinue() {
        changeFacilityService.send({
          type: 'CONTINUE',
        });
      }
      function sendBack() {
        changeFacilityService.send({
          type: 'BACK',
        });
      }
      return {
        mergeAccountInfoLine1,
        mergeAccountInfoLine2,
        sendBack,
        handleContinue,
      };
    },

    $trs: {
      documentTitle: {
        message: 'Change facility',
        context: 'Title of this step for the change facility page.',
      },
      confirmMergeInfoLine1: {
        message:
          'An account with the username ‘{username}’ already exists in the ‘{target_facility}’ learning facility.',
        context: 'Text explaining the consequences merging will have.',
      },
      confirmMergeInfoLine2: {
        message:
          'You can merge all of your account and progress data with this account in ‘{target_facility}’ learning facility, or you can create a new account. All of your progress data will be moved to this new account.',
        context: 'Text explaining the consequences merging will have.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .confirm {
    margin-top: 40px;
  }

</style>
