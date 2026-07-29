module.exports = {
  // Global defaults applied to every subdirectory that does not have its
  // own entry under `directories` below.
  figlet_auto: false,
  figlet_text: 'with-overrides',
  figlet_font: 'Standard',
  sub_header: 'Default header for any directory without an override',
  sub_body: 'Default body for any directory without an override',
  // Per-directory overrides: keys are project-root-relative POSIX paths
  // and matching is exact (no cascade). Each entry patches only the eight
  // text fields listed in the README — ignore rules and `max_depth` stay
  // global so the walker cannot drift between directories.
  directories: {
    src: {
      sub_header: 'Source code lives here',
      sub_body: 'Every module in src/ is independently testable.'
    },
    'src/hooks': {
      sub_header: 'Lifecycle hooks',
      sub_body: 'Scripts run before/after specific git events.',
      // Empty strings clear the corresponding section in the targeted
      // README only; descendants keep the global default.
      sub_footer: ''
    },
    '.vscode': {
      sub_header: 'Editor settings shared across the team'
    }
  }
};