<template>

  <div>
    <h1>{{ $tr('documentTitle') }}</h1>
    <p>{{ firstLine }}</p>
    <p>{{ secondLine }}</p>
    <p>{{ thirdLine }}</p>
    <BottomAppBar>
      <slot name="buttons">
        <KButtonGroup>
          <KButton
            :primary="false"
            :text="$tr('mergeAccounts')"
            appearance="flat-button"
            @click="to_merge"
          />
          <KButton
            :primary="true"
            :text="coreString('continueAction')"
            @click="to_continue"
          />
        </KButtonGroup>
      </slot>
    </BottomAppBar>

  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import BottomAppBar from 'kolibri.coreVue.components.BottomAppBar';

  export default {
    name: 'ConfirmChangeFacility',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: { BottomAppBar },

    mixins: [commonCoreStrings],

    inject: ['changeFacilityService', 'state'],
    computed: {
      targetFacility() {
        return this.state.value.targetFacility;
      },
      role() {
        return this.state.value.role;
      },
      firstLine() {
        return this.$tr('changeFacilityInfoLine1', {
          target_facility: this.targetFacility.name,
        });
      },
      secondLine() {
        if (this.role === 'learner') return '';
        return this.$tr('changeFacilityInfoLine2', {
          role: this.role,
        });
      },
      thirdLine() {
        return this.$tr('changeFacilityInfoLine3', {
          target_facility: this.targetFacility.name,
        });
      },
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
      documentTitle: {
        message: 'Change Facility',
        context: 'Title of this step for the change facility page.',
      },
      mergeAccounts: {
        message: 'Merge Accounts',
        context: 'Button for the merge accounts between facilities.',
      },
      changeFacilityInfoLine1: {
        message:
          'You are about to move your account and progress data to ‘{target_facility}’ learning facility. Your data will still be available to you and will also be accessible to any administrators of this learning facility.',
        context: 'First line of text explaining what changing to another learning facility means.',
      },
      changeFacilityInfoLine2: {
        message:
          'Your user account type will change from ‘{role} to ‘learner’. You will need another admin to change your account type to ‘{role}’ again.',
        context:
          'Second line of text explaining that changing to another learning facility will downgrade the user role to learner',
      },
      changeFacilityInfoLine3: {
        message:
          'You can also search for an account to merge with in ‘{target_facility}’ learning facility. Progress data from both accounts will be combined into one account.',
        context: 'Last line of text explaining what changing to another learning facility means.',
      },
    },
  };

</script>
