<template>
  <div>
    <fieldwrapper class="user-field">
      <label for="password">Password</label>

      <input
        @focus="clearErrorMessage"
        type="password"
        class="add-form"
        id="password"
        required
        v-model="password">
    </fieldwrapper>

    <fieldwrapper class="user-field">
      <label for="confirm-password">Confirm Password</label>

      <input
        @focus="clearErrorMessage"
        type="password"
        class="add-form"
        id="confirm-password"
        required
        v-model="passwordConfirm">
    </fieldwrapper>
  </div>
</template>

<script></script>

<style lang="stylus" scoped>
  @require './text-field.styl'
</style>
