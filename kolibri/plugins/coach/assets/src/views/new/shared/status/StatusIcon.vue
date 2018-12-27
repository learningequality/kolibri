<template>

  <mat-svg v-if="icon === 'clock'" category="device" name="access_time" />
  <mat-svg v-else-if="icon === 'star'" category="action" name="stars" />
  <mat-svg v-else-if="icon === 'help'" category="alert" name="error" />
  <mat-svg v-else-if="icon === 'learners'" category="social" name="people" />
  <mat-svg v-else-if="icon === 'nothing'" category="content" name="remove_circle" />

</template>


<script>

  export default {
    name: 'StatusIcon',
    props: {
      icon: {
        type: String,
        required: true,
        validator(value) {
          return ['clock', 'star', 'help', 'learners', 'nothing'].includes(value);
        },
      },
    },
  };

</script>


<style lang="scss" scoped></style>
