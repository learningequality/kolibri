<template>

  <div style="margin-left: 0px;">
    <KButton 
      v-for="user in users" 
      :key="user.name" 
      style="width: 100%; text-align: left;"
      @click="$emit('userSelected', user)"
    >

      <KIcon icon="person" style="margin-right: 8px" />

      {{ user.name }}

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
    },
    methods: {
      handleUserSelection(user) {
        // Do the things now.
        // Do we require passwords?
        // -> emit('logInThisPerson') and handle in parent?
        // ------> probably this... to make it easy to integrate with mfd
      },
    },
  };

</script>


<style lang="scss" scoped></style>
