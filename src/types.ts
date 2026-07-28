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
}
