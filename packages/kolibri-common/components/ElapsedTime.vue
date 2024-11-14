<template>

  <KOptionalText :text="date ? $formatRelative(ceilingDate, { now: now }) : ''" />

</template>


<script>

  import useNow from 'kolibri/composables/useNow';

  export default {
    name: 'ElapsedTime',
    setup() {
      const { now } = useNow();
      return { now };
    },
    props: {
      date: {
        type: Date,
        default: null,
      },
    },
    computed: {
      ceilingDate() {
        if (this.date > this.now) {
          return this.now;
        }
        return this.date;
      },
    },
  };

</script>


<style lang="scss" scoped></style>
