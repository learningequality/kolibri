<template>

  <div>
    <h1>{{ coreString('changeLearningFacility') }}</h1>
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
            :text="profileString('createAccount')"
            :disabled="isCreateAccountButtonDisabled"
            appearance="flat-button"
            data-test="createButton"
            @click="to_create"
          />
          <KButton
            :primary="true"
            :text="profileString('mergeAccounts')"
            data-test="mergeButton"
            @click="to_merge"
          />
        </KButtonGroup>
      </slot>
    </BottomAppBar>
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import BottomAppBar from 'kolibri/components/BottomAppBar';
  import { computed, inject } from 'vue';
  import get from 'lodash/get';
  import commonProfileStrings from '../commonProfileStrings';

  export default {
    name: 'UsernameExists',
    metaInfo() {
      return {
        title: this.profileString('mergeAccounts'),
      };
    },
    components: { BottomAppBar },

    mixins: [commonCoreStrings, commonProfileStrings],
    setup() {
      const changeFacilityService = inject('changeFacilityService');
      const state = inject('state');

      const mergeAccountInfoLine1 = computed({
        get() {
          return this.$tr('changeFacilityInfoLine1', {
            target_facility: get(state, 'value.targetFacility.name', ''),
            username: get(state, 'value.username', ''),
          });
        },
      });

      const mergeAccountInfoLine2 = computed({
        get() {
          return this.$tr('changeFacilityInfoLine2', {
            target_facility: get(state, 'value.targetFacility.name', ''),
          });
        },
      });

      const isCreateAccountButtonDisabled = computed({
        get() {
          return !get(state, 'value.targetFacility.learner_can_sign_up', true);
        },
      });

      function to_create() {
        changeFacilityService.send({
          type: 'NEW',
        });
      }

      function to_merge() {
        changeFacilityService.send({
          type: 'MERGE',
        });
      }

      return {
        isCreateAccountButtonDisabled,
        mergeAccountInfoLine1,
        mergeAccountInfoLine2,
        to_create,
        to_merge,
      };
    },

    $trs: {
      changeFacilityInfoLine1: {
        message:
          "An account with the username '{username}' already exists in the '{target_facility}' learning facility. You can merge your account and its progress data with this account.",
        context:
          'First line of text explaining that the username also exists in the target facility.',
      },
      changeFacilityInfoLine2: {
        message:
          'Alternatively, you can create a new account and all your progress data will be moved to this new account.',
        context:
          'Second line of text explaining that the username also exists in the target facility.',
      },
    },
  };

</script>
