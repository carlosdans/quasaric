import { describe, expect, it } from 'vitest';
import { inspectInventory } from './inventoryQuality.js';

describe('inspectInventory', () => {
  it('flags missing versions without treating distinct components as duplicates', () => {
    const result = inspectInventory([{ id: 'a', name: 'Ubuntu' }, { id: 'b', name: 'Debian', version: '12' }]);
    expect(result.missingVersion).toEqual([{ id: 'a', name: 'Ubuntu' }]);
    expect(result.duplicates).toEqual([]);
  });
  it('detects duplicate name, vendor and version despite whitespace and case differences', () => {
    const result = inspectInventory([{ id: 'a', name: 'NGINX', vendor: ' F5 ', version: '1.25.0' }, { id: 'b', name: ' nginx ', vendor: 'f5', version: ' 1.25.0 ' }]);
    expect(result.duplicates).toEqual([{ id: 'b', name: ' nginx ', firstIndex: 1, row: 2 }]);
  });
  it('keeps distinct versions and vendors separate', () => {
    const result = inspectInventory([{ id: 'a', name: 'OpenSSL', vendor: 'OpenSSL', version: '3.0.1' }, { id: 'b', name: 'OpenSSL', vendor: 'OpenSSL', version: '3.0.2' }, { id: 'c', name: 'OpenSSL', vendor: 'Ubuntu', version: '3.0.1' }]);
    expect(result.duplicates).toEqual([]);
  });
  it('handles empty inventories and missing names safely', () => {
    expect(inspectInventory([])).toEqual({ missingVersion: [], duplicates: [] });
    expect(inspectInventory([{ id: 'a', version: '1.0' }]).duplicates).toEqual([]);
  });
});
