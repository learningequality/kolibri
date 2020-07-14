<template>

  <div class="sign-in-text">
    <div 
      v-if="showFacilityName && !showPasswordForm" 
      style="margin-top: 24px; margin-bottom: 16px; text-align: left;"
    >
      {{ strings.$tr("signInToFacilityLabel", { facility: selectedFacility.name }) }}
    </div>

    <!-- Asking for password, has multiple facilities or is not informal -->
    <div 
      v-else-if="showFacilityName && showPasswordForm" 
      style="margin-top: 24px; margin-bottom: 16px; text-align: left;"
    >
      {{ strings.$tr("signingInToFacilityAsUserLabel", { facility: selectedFacility.name, user: username }) }}
    </div>

    <!-- Asking for password, has one facility which is informal -->
    <div v-else-if="showPasswordForm">
      {{ strings.$tr("signingInAsUserLabel", { user: username }) }}
    </div>
  </div>

</template>


<script>

  import { mapGetters, mapState } from 'vuex';
  import { crossComponentTranslator } from 'kolibri.utils.i18n';
  import SignInPage from './index';

  export default {
    name: 'SignInHeading',
    props: {
      showFacilityName: {
        type: Boolean,
        required: true,
      },
      showPasswordForm: {
        type: Boolean,
        required: true,
      },
    },
    computed: {
      ...mapGetters(['selectedFacility']),
      ...mapState('signIn', ['username', 'password']),
      strings() {
        // Gross
        return crossComponentTranslator(SignInPage);
      },
    },
  };

</script>


<style scoped lang="scss">

  .sign-in-text {
    margin-top: 24px;
    margin-bottom: 16px;
    text-align: left;
  }

</style>
