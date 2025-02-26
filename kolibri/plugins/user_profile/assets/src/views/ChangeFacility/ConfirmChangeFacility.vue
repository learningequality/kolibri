<template>

  <div>
    <h1>{{ coreString('changeLearningFacility') }}</h1>
    <p>{{ firstLine }}</p>
    <p>{{ secondLine }}</p>
    <p>{{ thirdLine }}</p>
    <BottomAppBar>
      <slot name="buttons">
        <KButtonGroup>
          <KButton
            :primary="false"
            :text="profileString('mergeAccounts')"
            appearance="flat-button"
            @click="to_merge"
          />
          <KButton
            :primary="true"
            :text="coreString('continueAction')"
            :disabled="isCreateAccountDisabled"
            @click="to_continue"
          />
        </KButtonGroup>
      </slot>
    </BottomAppBar>
  </div>

</template>


<script>

  import get from 'lodash/get';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import BottomAppBar from 'kolibri/components/BottomAppBar';
  import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
  import commonProfileStrings from '../commonProfileStrings';

  export default {
    name: 'ConfirmChangeFacility',
    metaInfo() {
      return {
        title: this.profileString('mergeAccounts'),
      };
    },
    components: { BottomAppBar },

    mixins: [commonCoreStrings, commonProfileStrings],

    inject: ['changeFacilityService', 'state'],
    data() {
      return {
        lastUserOnDevice: false,
      };
    },
    computed: {
      targetFacility() {
        return this.state.targetFacility;
      },
      role() {
        return this.state.role;
      },
      isCreateAccountDisabled() {
        return !get(this.targetFacility, 'learner_can_sign_up');
      },
      firstLine() {
        return this.$tr('changeFacilityInfoLine1', {
          target_facility: this.targetFacility.name,
        });
      },
      secondLine() {
        if (this.role === 'learner' || this.lastUserOnDevice) return '';
        return this.$tr('changeFacilityInfoLine2', {
          role: this.role,
          facility: this.targetFacility.name,
        });
      },
      thirdLine() {
        return this.$tr('changeFacilityInfoLine3', {
          target_facility: this.targetFacility.name,
        });
      },
    },
    created() {
      FacilityUserResource.fetchCollection({
        force: true,
        getParams: {
          member_of: this.state.sourceFacility,
        },
      }).then(users => {
        if (Object.keys(users).length === 1) {
          this.lastUserOnDevice = true;
        }
      });
    },
    methods: {
      to_continue() {
        this.changeFacilityService.send({
          type: 'CONTINUE',
        });
      },
      to_merge() {
        this.changeFacilityService.send({
          type: 'MERGE',
        });
      },
    },

    $trs: {
      changeFacilityInfoLine1: {
        message:
          "You are about to move your account and progress data to '{target_facility}' learning facility. Your current data will still be available to you and will also be accessible to any administrators of this learning facility.",
        context: 'First line of text explaining what changing to another learning facility means.',
      },
      changeFacilityInfoLine2: {
        message:
          "Your user account type will change from '{role}' to 'learner' and you will no longer be able to manage resources on this device. You will need someone with admin permissions in '{facility}' to change your account type back to '{role}'.",
        context:
          'Second line of text explaining that changing to another learning facility will downgrade the user role to learner',
      },
      changeFacilityInfoLine3: {
        message:
          "You can also search for an account in '{target_facility}' to merge with. Progress data from both accounts will be combined into one account.",
        context: 'Last line of text explaining what changing to another learning facility means.',
      },
    },
  };

</script>
