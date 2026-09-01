/**
 * Entry point for HTML5 Zip sandbox handler.
 *
 * This module is loaded inside the sandboxed iframe and registers
 * the Html5ZipHandler with the SandboxEnvironment.
 */
import Html5ZipHandler from './Html5ZipHandler';

// Instantiate the handler - this self-registers with window.SandboxEnvironment
new Html5ZipHandler(window.SandboxEnvironment);
