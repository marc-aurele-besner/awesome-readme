module.exports = {
  // Skip the auto-generated figlet banner; `figlet_text` is rendered at build
  // time so the artwork stays in sync with the chosen font.
  figlet_auto: false,
  figlet_text: 'with-config',
  figlet_font: 'Standard',
  // Hand-written sections for the root README. Subdirectory READMEs keep the
  // global `sub_*` defaults below.
  root_header: '\n## What this example shows\n\nA custom header, custom footer, and an `ignore_files` glob.\n',
  root_footer: '\n## Contributing\n\nSee the parent project for guidelines.\n',
  // Hide the build-output directory without having to drop a `.gitignore`.
  ignore_files: ['build/']
};