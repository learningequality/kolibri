// This file exists to import everything else (and define the module exports).
// It is the root for building the bundle.
import { InitBloomPlayerControls } from "./bloom-player-controls";

// receiveMessage is used by parent windows (currently native Android code using WebView)
// that can't set up a message to be received using window.addEventListener("message"...).
export { receiveMessage } from "./externalContext";

// When the module is loaded we call this to kick everything off.
InitBloomPlayerControls();
