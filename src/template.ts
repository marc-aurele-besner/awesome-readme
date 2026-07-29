/**
 * Tiny Mustache-flavoured template renderer used by the README generator.
 *
 * The generator used to assemble each README by string-concatenating ten or
 * so pieces, which made layout changes tedious and let the root and
 * subdirectory paths drift apart. This module replaces that with a single
 * template per README, so custom layouts are a matter of writing a template
 * file instead of patching two parallel string templates in source.
 *
 * Supported syntax:
 *
 * - `{{name}}` — substitute a value from the `values` object. Missing or
 *   `null` values render as the empty string; numbers and booleans render as
 *   their string form (booleans as `"true"` / `""`).
 *
 * - `{{#if name}}…{{/if}}` — render the body only when `name` is truthy. A
 *   value is truthy when it is a non-empty string, a non-empty array, a
 *   non-zero number, or literally `true`.
 *
 * - `{{#each name}}…{{/each}}` — render the body once per entry in `name`.
 *   Inside the body, `{{this}}` references the entry itself; when the entry
 *   is an object its fields are also exposed as bare names so
 *   `{{label}}` works alongside `{{this}}`.
 *
 * The renderer is intentionally small and dependency-free: README templates
 * rarely need more than these three constructs, and pulling in Handlebars
 * or Mustache would inflate the install footprint for very little gain.
 */

/** Values accepted by `renderTemplate`. */
export type TemplateVariables = Record<string, unknown>;

/**
 * Render a template string against the given variable bag.
 *
 * Placeholders, `if` blocks and `each` blocks are evaluated in that order.
 * `each` bodies are recursively rendered so nested `{{var}}` and `{{#if}}`
 * constructs work as expected. `each` and `if` blocks are non-greedy and
 * match their first closing tag, which is enough for the README templates
 * this module ships with.
 */
export const renderTemplate = (template: string, values: TemplateVariables): string => {
  // `each` first: the body is recursively rendered, so its inner `{{var}}`
  // and `{{#if}}` placeholders are resolved in the recursive call rather
  // than here.
  const eachExpanded = template.replace(/\{\{#each\s+([\w$]+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_match, name: string, body: string) => {
    const list = values[name];
    if (!Array.isArray(list)) return '';
    return list
      .map((entry) => {
        // An object entry's fields are merged into the value bag so the
        // body can reference them directly (`{{label}}`); a primitive
        // entry is exposed only as `{{this}}` and inherits no fields.
        const scoped: TemplateVariables =
          entry !== null && typeof entry === 'object' ? { ...values, ...(entry as TemplateVariables), this: entry } : { ...values, this: entry };
        return renderTemplate(body, scoped);
      })
      .join('');
  });
  // `if` next: by the time we get here every `each` block is fully expanded,
  // so the body has no nested `{{#each}}` to confuse the regex.
  const ifExpanded = eachExpanded.replace(/\{\{#if\s+([\w$]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_match, name: string, body: string) =>
    isTruthy(values[name]) ? body : ''
  );
  // Variable substitution last: any `{{name}}` left in the string is a
  // plain reference into the value bag. Dotted paths (`{{user.name}}`) walk
  // an object chain so loop bodies can reach at fields like `{{this.role}}`
  // without having to repeat the object literal in the value bag.
  return ifExpanded.replace(/\{\{([\w$.]+)\}\}/g, (_match, name: string) => stringifyValue(resolvePath(values, name)));
};

/**
 * Walk a dotted path against an arbitrary value bag.
 *
 * `user.name` reads `values.user.name`; `this.role` reads the current loop
 * entry's `role` field. A missing intermediate value returns `undefined`,
 * which `stringifyValue` then renders as the empty string.
 */
const resolvePath = (values: TemplateVariables, path: string): unknown => {
  const parts = path.split('.');
  let current: unknown = values[parts[0]];
  for (let index = 1; index < parts.length; index += 1) {
    if (current === undefined || current === null) return undefined;
    current = (current as Record<string, unknown>)[parts[index]];
  }
  return current;
};

const isTruthy = (value: unknown): boolean => {
  if (value === undefined || value === null || value === false) return false;
  if (typeof value === 'string') return value.length > 0;
  if (typeof value === 'number') return value !== 0;
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value);
};

const stringifyValue = (value: unknown): string => {
  if (value === undefined || value === null) return '';
  if (typeof value === 'boolean') return value ? 'true' : '';
  return String(value);
};

/**
 * Default template for the project root README.
 *
 * The shape mirrors what the generator produced before templates existed, so
 * existing projects see the same output by default. Every section that used
 * to be a conditional inline expression is gated here by `{{#if}}`, which
 * keeps the placeholder list short and the conditional logic readable.
 */
export const DEFAULT_ROOT_TEMPLATE = `{{licenseBadge}}{{#if licenseBadge}}
{{/if}}{{license}}
# {{name}}
{{figlet}}
{{header}}{{#if directories}}

## Directories
{{directories}}{{/if}}{{#if files}}{{files}}{{/if}}{{body}}{{#if tree}}

## Directory Tree
{{tree}}{{/if}}
{{footer}}`;

/**
 * Default template for every subdirectory README.
 *
 * Same shape as the root template with two additions: a `[<- Previous]`
 * link inside the directory tree section, and an optional `{{description}}`
 * paragraph rendered straight under the banner.
 */
export const DEFAULT_SUB_TEMPLATE = `{{licenseBadge}}{{#if licenseBadge}}

{{/if}}{{license}}
# {{name}}
{{figlet}}{{#if description}}
{{description}}{{/if}}
{{header}}{{#if directories}}

## Directories
{{directories}}{{/if}}{{#if files}}{{files}}{{/if}}{{body}}{{#if tree}}

## Directory Tree
[<- Previous]({{previousUrl}})
{{tree}}{{/if}}
{{footer}}`;

/**
 * Read a custom template from disk.
 *
 * Path resolution mirrors `--config`: relative paths are resolved against the
 * current working directory, so a `--template-root ./my-template.md` works
 * without the caller having to spell out an absolute location. A missing
 * file is reported with the resolved absolute path so the user can fix
 * typos without having to guess where the resolver looked.
 */
export const loadTemplateFile = (templatePath: string): string => {
  const fs = require('fs') as typeof import('fs');
  const path = require('path') as typeof import('path');
  const resolved = path.resolve(templatePath);
  if (!fs.existsSync(resolved)) throw new Error(`Template file not found: ${resolved}`);
  return fs.readFileSync(resolved, 'utf8');
};

export default renderTemplate;
