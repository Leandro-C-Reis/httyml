 # Open VS Code outside the terminal

  ## Summary

  Launch the existing code <cwd> behavior as a detached app-side process, so it never writes to, starts, or otherwise affects the current terminal.

  ## Key changes

  - Add a Tauri command in src-tauri/src/lib.rs that starts the fixed code executable with the terminal’s live cwd as a single argument—without a shell and without waiting
    for it to exit.

  - Register the command with the Tauri invoke handler. It will reject an empty directory and return a clear error if the VS Code CLI is unavailable on PATH.
  - Expose an openInVsCode(cwd) wrapper from src/lib/daemon.ts.
  - Change TerminalSideMenu to call that wrapper directly and surface failures through its existing onError callback.
  - Remove the shellQuote dependency from this button only; project/package scripts continue using onRun and the terminal unchanged.

  ## Tests

  - Update side-menu tests to assert that clicking the button calls openInVsCode with the raw directory path, including paths with spaces.
  - Assert the action never calls onRun, proving it cannot write to or restart the terminal.
  - Add an error-path test that verifies a failed launch reaches onError.
  - Run frontend tests, production build, and Rust workspace tests.

  ## Assumptions

  - “Same way” means invoking the installed code CLI with the terminal directory, preserving its current behavior.
  - If code is not installed or not on PATH, the app reports the failure rather than falling back to terminal input.