/**
 * Entry point for H5P sandbox handler.
 *
 * This module is loaded inside the sandboxed iframe and registers
 * the H5PHandler with the SandboxEnvironment.
 */
import H5PHandler from './H5PHandler';

// Instantiate the handler - this self-registers with window.SandboxEnvironment
new H5PHandler(window.SandboxEnvironment);
