<template>

  <div>
    <h1>{{ $tr('documentTitle') }}</h1>
    <p>{{ firstLine }}</p>
    <p>{{ secondLine }}</p>
    <BottomAppBar>
      <slot name="buttons">
        <KButtonGroup>
          <KButton
            :primary="false"
            :text="$tr('createAccount')"
            appearance="flat-button"
            data-test="createButton"
            @click="to_create"
          />
          <KButton
            :primary="true"
            :text="$tr('mergeAccounts')"
            data-test="mergeButton"
            @click="to_merge"
          />
        </KButtonGroup>
      </slot>
    </BottomAppBar>

  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import BottomAppBar from 'kolibri.coreVue.components.BottomAppBar';
  import { computed } from 'kolibri.lib.vueCompositionApi';
  import get from 'lodash/get';

  export default {
    name: 'UsernameExists',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: { BottomAppBar },

    mixins: [commonCoreStrings],
    setup() {
      const firstLine = computed({
        get() {
          return this.$tr('changeFacilityInfoLine1', {
            target_facility: get(this.state, 'value.targetFacility.name', ''),
            username: get(this.state, 'value.username', ''),
          });
        },
      });

      const secondLine = computed({
        get() {
          return this.$tr('changeFacilityInfoLine2', {
            target_facility: get(this.state, 'value.targetFacility.name', ''),
          });
        },
      });

      function to_create() {
        this.changeFacilityService.send({
          type: 'NEW',
        });
      }

      function to_merge() {
        this.changeFacilityService.send({
          type: 'MERGE',
        });
      }

      return { firstLine, secondLine, to_create, to_merge };
    },

    inject: ['changeFacilityService', 'state'],

    $trs: {
      documentTitle: {
        message: 'Change Facility',
        context: 'Title of this step for the change facility page.',
      },
      mergeAccounts: {
        message: 'Merge Accounts',
        context: 'Button for the merge accounts between facilities.',
      },
      createAccount: {
        message: 'Create new account',
        context: 'Button for the create new account in the new facility.',
      },
      changeFacilityInfoLine1: {
        message:
          'An account with the username ‘{username}’ already exists in the ‘{target_facility}’ learning facility.',
        context:
          'First line of text explaining that the username also exists in the target facility.',
      },
      changeFacilityInfoLine2: {
        message:
          'You can merge all of your account and progress data with this account in ‘{target_facility}’ learning facility, or you can create a new account. All of your progress data will be moved to this new account.',
        context:
          'Second line of text explaining that the username also exists in the target facility.',
      },
    },
  };

</script>
