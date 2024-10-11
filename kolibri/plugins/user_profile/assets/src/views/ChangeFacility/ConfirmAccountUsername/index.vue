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
            :text="profileString('createAccount')"
            :disabled="isCreateAccountButtonDisabled"
            data-test="createNewAccountButton"
            appearance="flat-button"
            @click="to_create"
          />
          <KButton
            :primary="true"
            :text="coreString('continueAction')"
            :disabled="usernameExists"
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
  import commonProfileStrings from '../../commonProfileStrings';

  export default {
    name: 'ConfirmAccountUsername',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: { BottomAppBar },

    mixins: [commonCoreStrings, commonProfileStrings],

    inject: ['changeFacilityService', 'state'],
    computed: {
      targetFacility() {
        return get(this.state, 'value.targetFacility');
      },
      username() {
        return get(this.state, 'value.username');
      },
      usernameExists() {
        return get(this.state, 'value.accountExists');
      },
      isCreateAccountButtonDisabled() {
        return !get(this.targetFacility, 'learner_can_sign_up');
      },
      firstLine() {
        return this.$tr('confirmAccountLine1', {
          target_facility: get(this.targetFacility, 'name', ''),
          username: this.username,
        });
      },
      secondLine() {
        return this.$tr('confirmAccountLine2', {
          target_facility: get(this.targetFacility, 'name', ''),
        });
      },
    },

    methods: {
      to_continue() {
        this.changeFacilityService.send({
          type: 'CONTINUE',
        });
      },
      to_create() {
        this.changeFacilityService.send({
          type: 'NEW',
        });
      },
    },

    $trs: {
      documentTitle: {
        message: 'Confirm account username',
        context: 'Title of this step for the change facility page.',
      },
      confirmAccountLine1: {
        message: "You are about to join '{target_facility}' learning facility as '{username}'.",
        context:
          'First line of text confirming the username and facility where the user is changing.',
      },
      confirmAccountLine2: {
        message:
          "You can continue with this username or create a new account for '{target_facility}'.",
        context:
          'Second line of text confirming the username and facility where the user is changing',
      },
    },
  };

</script>
