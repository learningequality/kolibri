<template>

  <!-- eslint-disable vue/no-v-html -->
  <div v-html="html">
    <!-- eslint-enable -->
  </div>

</template>


<script>

  import { filterXSS, safeAttrValue as baseSafeAttrValue, escapeAttrValue } from 'xss';
  import logger from 'kolibri.lib.logging';
  import qtiMixin from '../mixins/qtiMixin';

  const logging = logger.getLogger(__filename);

  const serializer = new XMLSerializer();

  const mimetypes = {
    mp3: 'audio/mpeg',
    m4a: 'audio/x-m4a',
    ogg: 'audio/ogg',
    wav: 'audio/x-wav',
    bmp: 'image/x-ms-bmp',
    gif: 'image/gif',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    png: 'image/png',
    svg: 'image/svg+xml',
    tif: 'image/tiff',
    tiff: 'image/tiff',
    mp4: 'video/mp4',
    webm: 'video/webm',
  };

  function createBlobUrl(uint8array, fileName) {
    let type = '';
    const fileNameExt = fileName.split('.').slice(-1)[0];
    if (fileNameExt) {
      const ext = fileNameExt.toLowerCase();
      type = mimetypes[ext];
    }
    const blob = new Blob([uint8array.buffer], { type });
    return URL.createObjectURL(blob);
  }

  function safeAttrValue(tag, name, value, cssFilter) {
    const newValue = baseSafeAttrValue(tag, name, value, cssFilter);
    if (name === 'href' || name === 'src') {
      if (value.substring(0, 5) === 'blob:') {
        return escapeAttrValue(value);
      }
    }
    return newValue;
  }

  export default {
    name: 'ZipHTML',
    mixins: [qtiMixin],
    props: {
      node: {
        required: true,
        type: Element,
      },
    },
    data() {
      return {
        html: '',
      };
    },
    created() {
      this.htmlSerialize();
    },
    methods: {
      htmlSerialize() {
        return this.substituteBloblUrls('img', 'src', this.node).then(() => {
          const html = filterXSS(serializer.serializeToString(this.node), {
            safeAttrValue,
            stripIgnoreTag: true,
            stripIgnoreTagBody: true,
          });
          if (html.trim() === '[removed]') {
            this.html = '';
          } else {
            this.html = html;
          }
        });
      },
      substituteBloblUrls(tagName, attribute, htmlElement) {
        const promises = [];
        for (let tag of htmlElement.getElementsByTagName(tagName)) {
          if (tag.getAttribute(attribute)) {
            const path = new URL(
              tag.getAttribute(attribute),
              new URL(this.getFilePath(), 'http://b.b/')
            ).pathname.substring(1);
            promises.push(
              this.getFile(path)
                .then(file => {
                  const url = createBlobUrl(file.obj, path);
                  tag.setAttribute(attribute, url);
                })
                .catch(() => {
                  logging.error(`Could not load ${path}`);
                })
            );
          }
        }
        return Promise.all(promises);
      },
    },
  };

</script>
