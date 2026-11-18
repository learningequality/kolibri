Kolibri Sandbox: HTML5 App Bridge Library
========================================

About
-----

Kolibri Sandbox is a library to allow for mocking of various HTML5 APIs inside a sandboxed iframe. In addition, it leverages the postMessage API to allow for controlled communication and data persistence from inside the sandboxed iframe. This means that HTML5 apps within Kolibri can have persistent state that is backed by the ContentSummaryLog for that particular user.

The code inside the iframe mocks the localStorage, sessionStorage, document.cookie and indexedDB interfaces inside the iframe, allowing HTML5 apps contained therein to access them as if they were not sandboxed, but still safely.

Once this has been setup, it sends a ready event to the external code that may be listening that it is ready. Once it receives a return ready event, it loads the content type's handler bundle, creates a nested iframe, and hands it to the handler to navigate to the content.

This inner code then communicates with an object external to the iframe that is setup by the SandboxedContentViewer, that then communicates changes in persistent state to be saved into the extraFields object on the ContentSummaryLog.

Getting Started
----------------

Step 1: Install package deps (run from Kolibri root)

`pnpm install`

Step 2: Build Kolibri and kolibri-sandbox

`pnpm run build`

Writing a Content Handler
-------------------------

Each sandboxed content type ships a handler bundle, declared with `sandbox_handler: true` in its plugin's `buildConfig.js`. The sandbox loads that bundle by URL inside the iframe and waits for it to register.

**A handler must register during script evaluation.** Subclass `SandboxHandler` and register it at module scope:

```
import H5PHandler from './H5PHandler';

H5PHandler.register();
```

The sandbox checks for a registration when the script's `load` event fires, so a handler registered later — from a promise callback, a `setTimeout`, or a dynamic `import()` — fails with `Handler script loaded but did not register`. A script that throws while evaluating still fires `load`, so "loaded, nothing registered" is the only failure signal the loader gets.

A shim in the handler's own `shims` replaces the base shim (`SandboxHandler.baseShims`) with the same `shimName`.

### Talking to the host

Handler to host, through `SandboxHandler` methods. The content frame shares the handler's origin and can call these itself, so the host must validate what they carry before acting on it:

- `requestFromHost(request)`: resolves with what the viewer's `onHandlerRequest` option answers; rejects if it throws or the viewer has none.
- `reportShowing(page)`: the viewer emits `nowShowing` with `page`.
- `renderFile(file)`: a viewer with the `renderFiles` option shows `{ data, mimetype, name, hasPrevious }` in place of the sandbox; `null` returns to the sandbox. Only raster images, audio and video a viewer plays, and PDF when a PDF viewer is enabled are shown; audio and video types need a plain subtype with no parameters (e.g. not `video/mp4; codecs=…`). Other types are ignored. `data` is a `Blob`, `ArrayBuffer` or `Uint8Array`; a `Blob` crosses without copying its bytes.
- `setFileOverlay(open)`: the handler shows a file over its own content; a viewer with the `renderFiles` option offers a way back.

Host to handler, by overriding `SandboxHandler` methods. The host calls them only once `init` has resolved. A throw or rejection is reported to the host as the viewer's `error`:

- `retarget(startUrl)`: the viewer's content URL changed; show it without reloading. A change made while `init` ran arrives after it. The host keeps showing any file it rendered; send `renderFile(null)`, or the file the new URL shows.
- `closeFile()`: the viewer dismissed the file the handler showed. For a non-image file under a host that listens to `goBack`, the viewer emits `goBack` instead of calling `closeFile`.
