
<template>

  <div v-if="needsToCreatePassword" style="text-align: left">
    <KButton
      appearance="basic-link"
      text=""
      style="margin-bottom: 16px;"
      @click="clearUser"
    >
      <KIcon
        :icon="back"
        :style="{
          fill: $themeTokens.primary,
          height: '1.125em',
          width: '1.125em',
          position: 'relative',
          marginRight: '8px',
          top: '2px',
        }"
      />{{ coreString('goBackAction') }}
    </KButton>
    <p>{{ $tr("needToMakeNewPasswordLabel", { user: username }) }}</p>
    <PasswordTextbox
      ref="createPassword"
      :autofocus="true"
      :disabled="busy"
      :value.sync="createdPassword"
      :isValid.sync="createdPasswordConfirmation"
      :shouldValidate="busy"
      @submitNewPassword="updatePasswordAndSignIn"
    />
    <KButton
      appearance="raised-button"
      :primary="true"
      :text="coreString('continueAction')"
      style="margin: 24px auto 0; display:block;"
      :disabled="busy"
      @click="updatePasswordAndSignIn"
    />
  </div>

</template>


<script>

  export default {
    name: 'SignInWithNewPassword',
  };

</script>
