<template>

  <div class="qr-scanner">
    <!--
      Live camera view. Rendered only when getUserMedia is available (HTTPS or
      localhost). On non-secure LAN deployments the camera pane is not shown.
    -->
    <div
      v-if="canUseCamera"
      class="camera-pane"
    >
      <video
        ref="videoRef"
        class="camera-video"
        :class="{ hidden: status !== 'streaming' && status !== 'scanning' }"
        autoplay
        muted
        playsinline
      ></video>

      <!-- Viewfinder overlay -->
      <div
        v-if="status === 'streaming' || status === 'scanning'"
        class="viewfinder"
        aria-hidden="true"
      >
        <div class="viewfinder-frame"></div>
      </div>

      <!-- Status / instruction overlay -->
      <div class="camera-status">
        <KCircularLoader
          v-if="status === 'starting'"
          :delay="false"
        />
        <p>{{ statusMessage$() }}</p>
      </div>
    </div>

    <!-- Error states -->
    <UiAlert
      v-if="!canUseCamera"
      class="status-alert"
      type="error"
      :dismissible="false"
    >
      {{ secureContextRequired$() }}
    </UiAlert>
    <UiAlert
      v-else-if="status === 'permission-denied'"
      class="status-alert"
      type="error"
      :dismissible="false"
    >
      {{ cameraPermissionDenied$() }}
    </UiAlert>
    <UiAlert
      v-else-if="status === 'no-camera'"
      class="status-alert"
      type="error"
      :dismissible="false"
    >
      {{ cameraNotFound$() }}
    </UiAlert>
    <UiAlert
      v-else-if="status === 'unavailable'"
      class="status-alert"
      type="error"
      :dismissible="false"
    >
      {{ cameraUnavailable$() }}
    </UiAlert>
  </div>

</template>


<script>

  import { onBeforeUnmount, ref, computed } from 'vue';
  import { BrowserMultiFormatReader } from '@zxing/browser';
  import { qrLoginStrings } from 'kolibri-common/strings/qrLoginStrings';
  import UiAlert from 'kolibri-design-system/lib/keen/UiAlert';
  import KCircularLoader from 'kolibri-design-system/lib/loaders/KCircularLoader';

  /**
   * The set of QR-code-like formats we ask the decoder to accept. We restrict to
   * square-matrix 2D formats so incidental 1D barcodes in the camera frame don't
   * produce false positives.
   */
  const QR_HINT_FORMATS = ['qr_code'];

  /**
   * Native BarcodeDetector is chromium-only and not constructible in jest/jsdom;
   * read it lazily so test environments don't blow up at import time.
   */
  function getNativeBarcodeDetectorConstructor() {
    if (typeof window === 'undefined') return null;
    return window.BarcodeDetector || null;
  }

  /**
   * A secure context (HTTPS or localhost) is required for getUserMedia. Kolibri is
   * frequently deployed over plain HTTP on a LAN, so we expose this so the host
   * page can decide whether to show the camera UI.
   */
  export const cameraSupported = () =>
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    typeof navigator !== 'undefined' &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function';

  export default {
    name: 'QRScanner',
    components: { UiAlert, KCircularLoader },
    setup(props, { emit }) {
      const {
        cameraStarting$,
        pointCameraAtCode$,
        secureContextRequired$,
        cameraPermissionDenied$,
        cameraNotFound$,
        cameraUnavailable$,
      } = qrLoginStrings;

      const videoRef = ref(null);
      /**
       * Scanner lifecycle status:
       *   idle | starting | streaming | scanning
       *   permission-denied | no-camera | unavailable
       * The 'scanning' state is used while a frame-loop is actively decoding.
       */
      const status = ref('idle');

      let nativeDetector = null;
      let nativeLoopActive = false;
      let zxingReader = null;
      let zxingControls = null;
      let activeStream = null;

      const canUseCamera = computed(() => cameraSupported());

      const statusMessage$ = computed(() => {
        if (status.value === 'starting') return cameraStarting$;
        // 'streaming' / 'scanning': show the pointing hint, not just "scanning…",
        // so the learner knows what to do.
        return pointCameraAtCode$;
      });

      async function start() {
        if (!canUseCamera.value) {
          status.value = 'unavailable';
          return;
        }
        status.value = 'starting';
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } },
            audio: false,
          });
          activeStream = stream;
          const videoEl = videoRef.value;
          if (!videoEl) {
            // Component unmounted during await.
            teardownStream();
            return;
          }
          videoEl.srcObject = stream;
          await videoEl.play().catch(() => {
            // Autoplay can race; play() rejection is recoverable once the stream
            // has enough data, so we don't surface this as a user-facing error.
          });
          status.value = 'streaming';
          await beginDecoding(videoEl);
        } catch (err) {
          handleCameraError(err);
        }
      }

      async function beginDecoding(videoEl) {
        const NativeCtor = getNativeBarcodeDetectorConstructor();
        if (NativeCtor) {
          try {
            nativeDetector = new NativeCtor({ formats: QR_HINT_FORMATS });
            status.value = 'scanning';
            runNativeFrameLoop(videoEl);
            return;
          } catch (err) {
            // Some Chromium builds reject the format list; fall through to zxing.
            nativeDetector = null;
          }
        }
        // Fallback: @zxing/browser continuous decode (works on Safari/Firefox).
        try {
          zxingReader = new BrowserMultiFormatReader(undefined, {
            delayBetweenScanAttempts: 120,
          });
          status.value = 'scanning';
          zxingControls = await zxingReader.decodeFromVideoDevice(undefined, videoEl, result => {
            if (result) {
              emit('decoded', result.getText());
            }
          });
        } catch (err) {
          handleCameraError(err);
        }
      }

      /**
       * Native BarcodeDetector is pull-based, so we drive it with a requestAnimationFrame
       * loop. Sets `nativeLoopActive` to false from stop() to terminate cleanly.
       */
      function runNativeFrameLoop(videoEl) {
        nativeLoopActive = true;
        const tick = async () => {
          if (!nativeLoopActive || !nativeDetector) return;
          try {
            const codes = await nativeDetector.detect(videoEl);
            if (codes && codes.length > 0 && codes[0].rawValue) {
              emit('decoded', codes[0].rawValue);
              return;
            }
          } catch (err) {
            // detect() can throw on transient empty frames; just keep going.
          }
          if (nativeLoopActive) {
            requestAnimationFrame(tick);
          }
        };
        requestAnimationFrame(tick);
      }

      function handleCameraError(err) {
        const name = err && err.name;
        if (name === 'NotAllowedError' || name === 'SecurityError') {
          status.value = 'permission-denied';
        } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
          status.value = 'no-camera';
        } else {
          status.value = 'unavailable';
        }
        teardownStream();
      }

      function teardownStream() {
        nativeLoopActive = false;
        nativeDetector = null;
        if (zxingControls) {
          zxingControls.stop();
          zxingControls = null;
        }
        zxingReader = null;
        if (activeStream) {
          for (const track of activeStream.getTracks()) {
            try {
              track.stop();
            } catch (err) {
              // ignore
            }
          }
          activeStream = null;
        }
      }

      function stop() {
        status.value = 'idle';
        teardownStream();
      }

      onBeforeUnmount(() => {
        stop();
      });

      return {
        videoRef,
        status,
        canUseCamera,
        statusMessage$,
        secureContextRequired$,
        cameraPermissionDenied$,
        cameraNotFound$,
        cameraUnavailable$,
        // eslint-disable-next-line vue/no-unused-properties -- called by parent via template ref
        start,
        // eslint-disable-next-line vue/no-unused-properties -- called by parent via template ref
        stop,
      };
    },
  };

</script>


<style lang="scss" scoped>

  .qr-scanner {
    display: flex;
    flex-direction: column;
    gap: 16px;
    align-items: center;
    width: 100%;
  }

  .camera-pane {
    position: relative;
    width: 100%;
    max-width: 360px;
    aspect-ratio: 1 / 1;
    overflow: hidden;
    background-color: black;
    border-radius: 8px;
  }

  .camera-video {
    width: 100%;
    height: 100%;
    object-fit: cover;

    &.hidden {
      visibility: hidden;
    }
  }

  .viewfinder {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }

  .viewfinder-frame {
    width: 70%;
    height: 70%;
    border: 2px solid rgba(255, 255, 255, 0.9);
    border-radius: 8px;
    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.25);
  }

  .camera-status {
    position: absolute;
    right: 0;
    bottom: 8px;
    left: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center;
    padding: 0 16px;
    text-align: center;
    pointer-events: none;

    p {
      margin: 0;
      font-size: 13px;
      color: rgba(255, 255, 255, 0.95);
    }
  }

  .status-alert {
    width: 100%;
    max-width: 360px;
  }

</style>
