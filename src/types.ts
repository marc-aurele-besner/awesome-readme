export interface ExtraData {
  root_license: string;
  root_header: string;
  root_body: string;
  root_footer: string;
  sub_license: string;
  sub_header: string;
  sub_body: string;
  sub_footer: string;
  ignore_gitFiles: boolean;
  ignore_gitIgnoreFiles: boolean;
  ignore_files: string[];
  // Whether the built-in list of default ignore patterns (node_modules,
  // dist, coverage, build) should be merged with the user-provided
  // `ignore_files` patterns. Defaults to true; set to false to opt out
  // and only honour patterns from the config.
  ignore_defaults: boolean;
}
