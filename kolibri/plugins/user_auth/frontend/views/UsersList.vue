<template>

  <div>
    <KButton
      v-for="username in users"
      :key="username"
      class="listed-user"
      style="width: 100%; margin-left: 0; text-align: left"
      :disabled="busy"
      @click="$emit('userSelected', username)"
    >
      <KIcon
        icon="person"
        style="margin-right: 8px"
      />

      {{ username }}
    </KButton>
  </div>

</template>


<script>

  export default {
    name: 'UsersList',
    props: {
      users: {
        type: Array,
        required: true,
      },
      busy: {
        type: Boolean,
        default: false,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .listed-user {
    width: 100%;
    margin-top: 16px;
    margin-left: 0;
    text-align: left;
    text-transform: none;
  }

</style>
