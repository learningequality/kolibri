<template>

  <div class="">
    <div class="card-shadow" style="box-shadow:0px 0px 2px 0px;border-radius:5px;">
      <KGrid>
        <KGridItem
          :layout12="{ span: 6 }"
        >
          <div
            style="
                background-color:#fafafafa;
                width:100%;
                height:150px;
                margin:10px;
                justify-content: center;"
          >
            <KIcon icon="bookmark" size="large" />
          </div>
        </KGridItem>

        <KGridItem
          :layout12="{ span: 6 }"
        >
          <p>Bookmarks</p>
          <p>XX bookmarks</p>
        </KGridItem>
      </KGrid>
    </div>
  </div>

</template>


<script>

  export default {
    name: 'BookMarkedResource',
  };

</script>
