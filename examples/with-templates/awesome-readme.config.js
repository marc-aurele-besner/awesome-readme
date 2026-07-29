module.exports = {
  // Disable the auto-generated figlet so the custom template's banner slot
  // stays empty unless `figlet` / `figlet_text` is supplied explicitly.
  figlet_auto: false,
  // Point at the templates that ship with this example. The same paths
  // could be passed via the CLI as `--template-root` / `--template-sub`.
  // Relative paths resolve against the current working directory, matching
  // how `--config` is resolved.
  template_root: './templates/root.md',
  template_sub: './templates/sub.md'
};
