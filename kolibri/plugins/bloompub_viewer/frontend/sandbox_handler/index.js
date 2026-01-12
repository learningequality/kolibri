/**
 * Entry point for Bloompub sandbox handler.
 *
 * This module is loaded inside the sandboxed iframe and registers
 * the BloomHandler with the SandboxEnvironment.
 */
import BloomHandler from './BloomHandler';

// Instantiate the handler - this self-registers with window.SandboxEnvironment
new BloomHandler(window.SandboxEnvironment);
