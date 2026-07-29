// Tiny string formatter. The point is to give the nested example more than
// one leaf under `lib/`, so the subdirectory tree actually has branches.
const format = (label, value) => `${label}: ${value}`;

module.exports = { format };