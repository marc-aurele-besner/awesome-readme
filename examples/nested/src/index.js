// Top-level entry point for the nested example. Re-exports the helpers that
// live deeper in the tree so the README's auto-generated file list stays
// short and readable.
const { add } = require('./lib/math');
const { format } = require('./lib/format');

module.exports = { add, format };