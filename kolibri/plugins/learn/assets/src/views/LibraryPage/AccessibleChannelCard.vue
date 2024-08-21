<template>

  <div>
    <KCard
      :to="to"
      layout="horizontal"
      thumbnailDisplay="small"
    >
      <template #aboveTitle>
        <p>Above title</p>
      </template>
      <template #belowTitle>
        <div>
          <p>Below title</p>
        </div>
      </template>
    </KCard>
  </div>

</template>


<script>

  export default {
    name: 'AccessibleChannelCard',
    props:{
      to: {
        type: Object,
        required: true,
      },
    }
  }

</script>