import test from 'node:test';
import assert from 'node:assert/strict';
import { toCsv } from '../src/lib/csv.js';

test('CSV export neutralizes spreadsheet formula prefixes', () => {
  const csv = toCsv([[
    '=1+1',
    '+SUM(A1:A2)',
    '@SUM(A1:A2)',
    '-2',
    ' \t=1+1',
    '\u0001=1+1',
    '\tplain text',
    '\nplain text'
  ]]);
  assert.equal(csv, '\uFEFF' + [
    '"\'=1+1"',
    '"\'+SUM(A1:A2)"',
    '"\'@SUM(A1:A2)"',
    '"\'-2"',
    '"\' \t=1+1"',
    '"\'\u0001=1+1"',
    '"\'\tplain text"',
    '"\'\nplain text"'
  ].join(','));
});

test('CSV export preserves quoting, commas, quotes and embedded line breaks', () => {
  const csv = toCsv([['name', 'description'], ['Quasaric, agent', 'A "quoted" value\ncontinued']]);
  assert.equal(csv, '\uFEFF"name","description"\r\n"Quasaric, agent","A ""quoted"" value\ncontinued"');
});

test('CSV export keeps empty cells and CRLF row separators', () => {
  assert.equal(toCsv([['a', '', 'c'], ['1', '', '3']]), '\uFEFF"a","","c"\r\n"1","","3"');
});
