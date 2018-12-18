<template>

  <div>
    Notification card
  </div>

</template>


<script>

  export default {
    name: 'NotificationCard',
    components: {},
    props: {},
    computed: {},
    methods: {},
    $trs: {
      individualFinished: `{learnerName} finished '{itemName}'`,
      multipleFinished: `{learnerName} and {numOthers, number} {numOthers, plural, one {other} other {others}} finished '{itemName}'`,
      wholeClassroomFinished: `Everyone in '{classroomName}' finished '{itemName}'`,
      wholeLearnerGroupFinished: `Everyone finished '{itemName}'`,
      individualNeedsHelp: `{learnerName} needs help on '{itemName}'`,
      multipleNeedsHelp: `{learnerName} and {numOthers, number} {numOthers, plural, one {other} other {others}} need help on '{itemName}'`,
    },
  };

</script>


<style lang="scss" scoped></style>
