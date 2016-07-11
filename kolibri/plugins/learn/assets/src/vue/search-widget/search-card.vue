<template>

  <div class="search-card" v-link="link">
    <div class="header">
      <div class="content-icon" v-if="kind === 'topic'">
        <svg width="30px" height="24px" viewbox="0 0 30 24" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
          <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
            <g transform="translate(0.000000, -2.000000)" fill="#996189">
              <path d="M12,2 L3,2 C1.35,2 0.015,3.35 0.015,5 L0,23 C0,24.65 1.35,26 3,26 L27,26 C28.65,26 30,24.65 30,23 L30,8 C30,6.35 28.65,5 27,5 L15,5 L12,2 L12,2 Z"></path>
            </g>
          </g>
        </svg>
      </div>

      <div class="content-icon" v-if="kind === 'video' && progress === 'unstarted'">
        <svg width="30px" height="30px" viewbox="0 0 30 30" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
          <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
            <g>
              <path d="M15,30 C23.2842712,30 30,23.2842712 30,15 C30,6.71572875 23.2842712,-3.55271368e-15 15,-3.55271368e-15 C6.71572875,-3.55271368e-15 0,6.71572875 0,15 C0,23.2842712 6.71572875,30 15,30 Z" fill="#FFFFFF"></path>
              <path d="M12,22 L21.3333333,15 L12,8 L12,22 L12,22 Z M15,4 C8.928,4 4,8.928 4,15 C4,21.072 8.928,26 15,26 C21.072,26 26,21.072 26,15 C26,8.928 21.072,4 15,4 L15,4 Z M2,15 C2,7.83375 7.83375,2 15,2 C22.16625,2 28,7.83375 28,15 C28,22.16625 22.16625,28 15,28 C7.83375,28 2,22.16625 2,15 Z" fill="#996192"></path>
            </g>
          </g>
        </svg>
      </div>

      <div class="content-icon" v-if="kind === 'video' && progress === 'partial'">
        <svg width="30px" height="30px" viewbox="0 0 30 30" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
          <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
            <g>
              <path d="M15,30 C23.2842712,30 30,23.2842712 30,15 C30,6.71572875 23.2842712,-3.55271368e-15 15,-3.55271368e-15 C6.71572875,-3.55271368e-15 0,6.71572875 0,15 C0,23.2842712 6.71572875,30 15,30 Z" fill="#FFFFFF"></path>
              <path d="M4,15 C4,21.072 8.928,26 15,26 C21.072,26 26,21.072 26,15 L4,15 Z" fill="#E2D1E0"></path>
              <path d="M15,4 C8.928,4 4,8.928 4,15 C4,21.072 8.928,26 15,26 C21.072,26 26,21.072 26,15 C26,8.928 21.072,4 15,4 L15,4 Z M2,15 C2,7.83375 7.83375,2 15,2 C22.16625,2 28,7.83375 28,15 C28,22.16625 22.16625,28 15,28 C7.83375,28 2,22.16625 2,15 Z" fill="#996192"></path>
              <polygon fill="#996192" points="12 22 21.3333333 15 12 8"></polygon>
            </g>
          </g>
        </svg>
      </div>

      <div class="content-icon" v-if="kind === 'video' && progress === 'complete'">
        <svg width="30px" height="30px" viewbox="0 0 30 30" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
          <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
            <g>
                <path d="M15,30 C23.2842712,30 30,23.2842712 30,15 C30,6.71572875 23.2842712,-3.55271368e-15 15,-3.55271368e-15 C6.71572875,-3.55271368e-15 0,6.71572875 0,15 C0,23.2842712 6.71572875,30 15,30 Z" fill="#FFFFFF"></path>
                <path d="M12,22 L21.3333333,15 L12,8 L12,22 L12,22 Z M2,15 C2,7.83375 7.83375,2 15,2 C22.16625,2 28,7.83375 28,15 C28,22.16625 22.16625,28 15,28 C7.83375,28 2,22.16625 2,15 Z" fill="#996192"></path>
            </g>
          </g>
        </svg>
      </div>

      <div class="content-icon" v-if="kind === 'audio' && progress === 'unstarted'">
        <svg width="30px" height="30px" viewbox="0 0 30 30" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
            <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                <g>
                    <path d="M15,30 C23.2842712,30 30,23.2842712 30,15 C30,6.71572875 23.2842712,-3.55271368e-15 15,-3.55271368e-15 C6.71572875,-3.55271368e-15 0,6.71572875 0,15 C0,23.2842712 6.71572875,30 15,30 Z" fill="#FFFFFF"></path>
                    <path d="M2,15 C2,7.83375 7.83375,2 15,2 C22.16625,2 28,7.83375 28,15 C28,22.16625 22.16625,28 15,28 C7.83375,28 2,22.16625 2,15 Z M15,4 C8.928,4 4,8.928 4,15 C4,21.072 8.928,26 15,26 C21.072,26 26,21.072 26,15 C26,8.928 21.072,4 15,4 Z M8,12.6054732 L8,17.3945268 L11.1927024,17.3945268 L15.1835804,21.3854048 L15.1835804,8.61459521 L11.1927024,12.6054732 L8,12.6054732 Z M18.7753706,15 C18.7753706,13.5872292 17.9612315,12.3740023 16.7799316,11.7833523 L16.7799316,18.2086659 C17.9612315,17.6259977 18.7753706,16.4127708 18.7753706,15 Z M16.7799316,8 L16.7799316,9.64424173 C19.0866591,10.3306727 20.7708096,12.4697834 20.7708096,15 C20.7708096,17.5302166 19.0866591,19.6693273 16.7799316,20.3557583 L16.7799316,22 C19.9806157,21.2736602 22.3671608,18.4161916 22.3671608,15 C22.3671608,11.5838084 19.9806157,8.72633979 16.7799316,8 Z" fill="#996189"></path>
                </g>
            </g>
        </svg>
      </div>

      <div class="content-icon" v-if="kind === 'audio' && progress === 'partial'">
        <svg width="30px" height="30px" viewbox="0 0 30 30" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
            <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                <g>
                    <path d="M15,30 C23.2842712,30 30,23.2842712 30,15 C30,6.71572875 23.2842712,-3.55271368e-15 15,-3.55271368e-15 C6.71572875,-3.55271368e-15 0,6.71572875 0,15 C0,23.2842712 6.71572875,30 15,30 Z" fill="#FFFFFF"></path>
                    <path d="M4,15 C4,21.072 8.928,26 15,26 C21.072,26 26,21.072 26,15 L4,15 Z" fill="#E2D1E0"></path>
                    <path d="M2,15 C2,7.83375 7.83375,2 15,2 C22.16625,2 28,7.83375 28,15 C28,22.16625 22.16625,28 15,28 C7.83375,28 2,22.16625 2,15 Z M15,4 C8.928,4 4,8.928 4,15 C4,21.072 8.928,26 15,26 C21.072,26 26,21.072 26,15 C26,8.928 21.072,4 15,4 Z M8,12.6054732 L8,17.3945268 L11.1927024,17.3945268 L15.1835804,21.3854048 L15.1835804,8.61459521 L11.1927024,12.6054732 L8,12.6054732 Z M18.7753706,15 C18.7753706,13.5872292 17.9612315,12.3740023 16.7799316,11.7833523 L16.7799316,18.2086659 C17.9612315,17.6259977 18.7753706,16.4127708 18.7753706,15 Z M16.7799316,8 L16.7799316,9.64424173 C19.0866591,10.3306727 20.7708096,12.4697834 20.7708096,15 C20.7708096,17.5302166 19.0866591,19.6693273 16.7799316,20.3557583 L16.7799316,22 C19.9806157,21.2736602 22.3671608,18.4161916 22.3671608,15 C22.3671608,11.5838084 19.9806157,8.72633979 16.7799316,8 Z" fill="#996189"></path>
                </g>
            </g>
        </svg>
      </div>

      <div class="content-icon" v-if="kind === 'audio' && progress === 'complete'">
        <svg width="30px" height="30px" viewbox="0 0 30 30" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
            <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                <g>
                    <path d="M15,30 C23.2842712,30 30,23.2842712 30,15 C30,6.71572875 23.2842712,-3.55271368e-15 15,-3.55271368e-15 C6.71572875,-3.55271368e-15 0,6.71572875 0,15 C0,23.2842712 6.71572875,30 15,30 Z" fill="#FFFFFF"></path>
                    <path d="M2,15 C2,7.83375 7.83375,2 15,2 C22.16625,2 28,7.83375 28,15 C28,22.16625 22.16625,28 15,28 C7.83375,28 2,22.16625 2,15 Z M8,12.6054732 L8,17.3945268 L11.1927024,17.3945268 L15.1835804,21.3854048 L15.1835804,8.61459521 L11.1927024,12.6054732 L8,12.6054732 Z M18.7753706,15 C18.7753706,13.5872292 17.9612315,12.3740023 16.7799316,11.7833523 L16.7799316,18.2086659 C17.9612315,17.6259977 18.7753706,16.4127708 18.7753706,15 Z M16.7799316,8 L16.7799316,9.64424173 C19.0866591,10.3306727 20.7708096,12.4697834 20.7708096,15 C20.7708096,17.5302166 19.0866591,19.6693273 16.7799316,20.3557583 L16.7799316,22 C19.9806157,21.2736602 22.3671608,18.4161916 22.3671608,15 C22.3671608,11.5838084 19.9806157,8.72633979 16.7799316,8 Z" fill="#996189"></path>
                </g>
            </g>
        </svg>
      </div>

      <div class="content-icon" v-if="kind === 'document' && progress === 'unstarted'">
        <svg width="30px" height="30px" viewbox="0 0 30 30" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
            <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                <g>
                    <path d="M15,30 C23.2842712,30 30,23.2842712 30,15 C30,6.71572875 23.2842712,3.55271368e-15 15,3.55271368e-15 C6.71572875,3.55271368e-15 0,6.71572875 0,15 C0,23.2842712 6.71572875,30 15,30 Z" fill="#FFFFFF"></path>
                    <path d="M2,15 C2,7.83375 7.83375,2 15,2 C22.16625,2 28,7.83375 28,15 C28,22.16625 22.16625,28 15,28 C7.83375,28 2,22.16625 2,15 Z M15,4 C8.928,4 4,8.928 4,15 C4,21.072 8.928,26 15,26 C21.072,26 26,21.072 26,15 C26,8.928 21.072,4 15,4 Z M10.5357666,8 C9.69109497,8 9,8.74868622 9,9.66374715 L9,20.3386943 C9,21.2537552 9.69109497,22.0024414 10.5357666,22.0024414 L19.4820557,22.0024417 C20.3267273,22.0024417 21.0178223,21.2537555 21.0178223,20.3386946 L21.0178223,9.66374747 C21.0178223,8.74868654 20.3267273,8.00000032 19.4820557,8.00000032 L10.5357666,8 Z M19,12 L11,12 L11,10 L19,10 L19,12 Z M19,19.7617792 L14,19.7617792 L14,18 L19,18 L19,19.7617792 Z M19,16 L11,16 L11,14 L19,14 L19,16 Z" fill="#996189"></path>
                </g>
            </g>
        </svg>
      </div>

      <div class="content-icon" v-if="kind === 'document' && progress === 'partial'">
        <svg width="30px" height="30px" viewbox="0 0 30 30" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
            <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                <g>
                    <path d="M15,30 C23.2842712,30 30,23.2842712 30,15 C30,6.71572875 23.2842712,3.55271368e-15 15,3.55271368e-15 C6.71572875,3.55271368e-15 0,6.71572875 0,15 C0,23.2842712 6.71572875,30 15,30 Z" fill="#FFFFFF"></path>
                    <path d="M4,15 C4,21.072 8.928,26 15,26 C21.072,26 26,21.072 26,15 L4,15 Z" fill="#E2D1E0"></path>
                    <path d="M2,15 C2,7.83375 7.83375,2 15,2 C22.16625,2 28,7.83375 28,15 C28,22.16625 22.16625,28 15,28 C7.83375,28 2,22.16625 2,15 Z M15,4 C8.928,4 4,8.928 4,15 C4,21.072 8.928,26 15,26 C21.072,26 26,21.072 26,15 C26,8.928 21.072,4 15,4 Z M10.5357666,8 C9.69109497,8 9,8.74868622 9,9.66374715 L9,20.3386943 C9,21.2537552 9.69109497,22.0024414 10.5357666,22.0024414 L19.4820557,22.0024417 C20.3267273,22.0024417 21.0178223,21.2537555 21.0178223,20.3386946 L21.0178223,9.66374747 C21.0178223,8.74868654 20.3267273,8.00000032 19.4820557,8.00000032 L10.5357666,8 Z M19,12 L11,12 L11,10 L19,10 L19,12 Z M19,19.7617792 L14,19.7617792 L14,18 L19,18 L19,19.7617792 Z M19,16 L11,16 L11,14 L19,14 L19,16 Z" fill="#996189"></path>
                </g>
            </g>
        </svg>
      </div>

      <div class="content-icon" v-if="kind === 'document' && progress === 'complete'">
        <svg width="30px" height="30px" viewbox="0 0 30 30" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
            <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                <g>
                    <path d="M15,30 C23.2842712,30 30,23.2842712 30,15 C30,6.71572875 23.2842712,3.55271368e-15 15,3.55271368e-15 C6.71572875,3.55271368e-15 0,6.71572875 0,15 C0,23.2842712 6.71572875,30 15,30 Z" fill="#FFFFFF"></path>
                    <path d="M2,15 C2,7.83375 7.83375,2 15,2 C22.16625,2 28,7.83375 28,15 C28,22.16625 22.16625,28 15,28 C7.83375,28 2,22.16625 2,15 Z M10.5357666,8 C9.69109497,8 9,8.74868622 9,9.66374715 L9,20.3386943 C9,21.2537552 9.69109497,22.0024414 10.5357666,22.0024414 L19.4820557,22.0024417 C20.3267273,22.0024417 21.0178223,21.2537555 21.0178223,20.3386946 L21.0178223,9.66374747 C21.0178223,8.74868654 20.3267273,8.00000032 19.4820557,8.00000032 L10.5357666,8 Z M19,12 L11,12 L11,10 L19,10 L19,12 Z M19,19.7617792 L14,19.7617792 L14,18 L19,18 L19,19.7617792 Z M19,16 L11,16 L11,14 L19,14 L19,16 Z" fill="#996189"></path>
                </g>
            </g>
        </svg>
      </div>

      <div class="content-icon" v-if="kind === 'exercise' && progress === 'unstarted'">
        <svg width="30px" height="30px" viewbox="0 0 30 30" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
            <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                <g>
                    <path d="M15,30 C23.2842712,30 30,23.2842712 30,15 C30,6.71572875 23.2842712,3.55271368e-15 15,3.55271368e-15 C6.71572875,3.55271368e-15 0,6.71572875 0,15 C0,23.2842712 6.71572875,30 15,30 Z" fill="#FFFFFF"></path>
                    <path d="M2,15 C2,7.83375 7.83375,2 15,2 C22.16625,2 28,7.83375 28,15 C28,22.16625 22.16625,28 15,28 C7.83375,28 2,22.16625 2,15 Z M15,4 C8.928,4 4,8.928 4,15 C4,21.072 8.928,26 15,26 C21.072,26 26,21.072 26,15 C26,8.928 21.072,4 15,4 Z" fill="#996189"></path>
                    <polygon fill="#996192" points="15 18.689 19.326 21.3 18.178 16.379 22 13.068 16.967 12.641 15 8 13.033 12.641 8 13.068 11.822 16.379 10.674 21.3"></polygon>
                </g>
            </g>
        </svg>
      </div>

      <div class="content-icon" v-if="kind === 'exercise' && progress === 'partial'">
        <svg width="30px" height="30px" viewbox="0 0 30 30" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
            <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                <g>
                    <path d="M15,30 C23.2842712,30 30,23.2842712 30,15 C30,6.71572875 23.2842712,3.55271368e-15 15,3.55271368e-15 C6.71572875,3.55271368e-15 0,6.71572875 0,15 C0,23.2842712 6.71572875,30 15,30 Z" fill="#FFFFFF"></path>
                    <path d="M4,15 C4,21.072 8.928,26 15,26 C21.072,26 26,21.072 26,15 L4,15 Z" fill="#E2D1E0"></path>
                    <path d="M2,15 C2,7.83375 7.83375,2 15,2 C22.16625,2 28,7.83375 28,15 C28,22.16625 22.16625,28 15,28 C7.83375,28 2,22.16625 2,15 Z M15,4 C8.928,4 4,8.928 4,15 C4,21.072 8.928,26 15,26 C21.072,26 26,21.072 26,15 C26,8.928 21.072,4 15,4 Z M15,18.689 L19.326,21.3 L18.178,16.379 L22,13.068 L16.967,12.641 L15,8 L13.033,12.641 L8,13.068 L11.822,16.379 L10.674,21.3 L15,18.689 Z" fill="#996192"></path>
                </g>
            </g>
        </svg>
      </div>

      <div class="content-icon" v-if="kind === 'exercise' && progress === 'complete'">
        <svg width="30px" height="30px" viewbox="0 0 30 30" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
            <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                <g>
                    <path d="M15,30 C23.2842712,30 30,23.2842712 30,15 C30,6.71572875 23.2842712,3.55271368e-15 15,3.55271368e-15 C6.71572875,3.55271368e-15 0,6.71572875 0,15 C0,23.2842712 6.71572875,30 15,30 Z" fill="#FFFFFF"></path>
                    <path d="M2,15 C2,7.83375 7.83375,2 15,2 C22.16625,2 28,7.83375 28,15 C28,22.16625 22.16625,28 15,28 C7.83375,28 2,22.16625 2,15 Z M15,18.689 L19.326,21.3 L18.178,16.379 L22,13.068 L16.967,12.641 L15,8 L13.033,12.641 L8,13.068 L11.822,16.379 L10.674,21.3 L15,18.689 Z" fill="#996192"></path>
                </g>
            </g>
        </svg>
      </div>


      <h4>
        {{ title }}
      </h4>
    </div>
    <p class="description">
      {{ description }}
    </p>
  </div>

</template>


<script>

  const PageNames = require('../../state/constants').PageNames;

  module.exports = {
    computed: {
      link() {
        if (this.kind === 'topic') {
          return {
            name: PageNames.EXPLORE_TOPIC,
            params: { id: this.id },
          };
        }
        return {
          name: PageNames.EXPLORE_CONTENT,
          params: { id: this.id },
        };
      },
    },
    props: {
      id: {
        type: String,
        required: true,
      },
      title: {
        type: String,
        required: true,
      },
      description: {
        type: String,
        required: true,
      },
      thumbnail: {
        default: '',
      },
      kind: {
        type: String,
        required: true,
        validator(value) {
          return [
            'audio',
            'video',
            'document',
            'exercise',
            'topic',
          ].some(elem => elem === value);
        },
        default: 'topic',
      },
      progress: {
        type: String,
        validator(value) {
          return [
            'complete',
            'partial',
            'unstarted',
          ].some(elem => elem === value);
        },
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

  $card-border-radius: 5px
  
  .search-card
    margin-left: 15px
    margin-right: 5px
    margin-top: 5px
    margin-bottom: 5px
    background-color: $core-bg-light
    padding: 2px 16px
    border-radius: 4px
    cursor: pointer
    border: 2px solid transparent
  .search-card:hover
    border: 2px solid $core-action-light
    
  .header
    margin-top: 8px
  .content-icon
    width: 10%
    vertical-align:middle
    display: inline-block
  h4
    width: 80%
    margin-left: 8px
    margin-right: 8px
    margin-top: 0
    margin-bottom: 0
    color: $core-action-normal
    display: inline-flex

  .description
    color: $core-text-default
    font-size: 12px
    overflow: hidden
    text-overflow: ellipsis
    display: -webkit-box
    line-height: 16px /* fallback */
    max-height: 48px /* fallback */
    -webkit-line-clamp: 3 /* number of lines to show */
    -webkit-box-orient: vertical
    margin-top: 5px

</style>
