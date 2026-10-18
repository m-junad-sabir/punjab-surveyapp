import { EntityManager } from 'typeorm';
import { createIndustrialUnit } from './survey-response-writer';

describe('industry PSIC selection', () => {
  function setup(other = false, mapped = true) {
    const query = jest.fn(async (sql: string, parameters: unknown[]) => {
      if (sql.includes('SELECT v.requires_text')) return [{ requires_text: other }];
      if (sql.includes('FROM unit_type_psic_classes')) {
        return mapped ? [{ id: 30, group_id: 20, division_id: 10 }] : [];
      }
      if (sql.includes('FROM (SELECT $1::integer')) {
        expect(parameters).toEqual([10, 20, 30]);
        return [{
          division_id: 10, division_code: '96', division_name: 'Services',
          group_id: 20, group_code: '960', group_name: 'Services',
          class_id: 30, class_code: other ? '9609' : '1072', class_name: other ? 'Other personal service activities n.e.c.' : 'Manufacture of sugar',
        }];
      }
      if (sql.includes('INSERT INTO industrial_units')) return [{ id: 'saved-unit' }];
      return [];
    });
    const answers = new Map<string, unknown>([
      ['A_UNIT_TYPE', other ? { option_id: 61, other_text: 'Custom industry' } : 1],
      ['A_PSIC', { psic_class_id: 30, psic_group_id: 999, psic_division_id: 999 }],
    ]);
    const save = () => createIndustrialUnit(
      { query } as unknown as EntityManager,
      'surveyor', answers, 'Example Unit',
      { lat: null, lng: null, accuracy: null }, true,
    );
    return { query, save };
  }

  it('derives the hierarchy and saves the selected industry', async () => {
    const { query, save } = setup();
    await expect(save()).resolves.toBe('saved-unit');
    expect(query).toHaveBeenCalledWith(
      'UPDATE industrial_units SET unit_type_id = $2, unit_type_other_text = $3 WHERE id = $1',
      ['saved-unit', 1, null],
    );
  });

  it('keeps specified Other text and the official 9609 class', async () => {
    const { query, save } = setup(true);
    await expect(save()).resolves.toBe('saved-unit');
    const insertion = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO industrial_units'));
    expect(insertion?.[1]).toContain('9609 - Other personal service activities n.e.c.');
    expect(query).toHaveBeenCalledWith(
      'UPDATE industrial_units SET unit_type_id = $2, unit_type_other_text = $3 WHERE id = $1',
      ['saved-unit', 61, 'Custom industry'],
    );
  });

  it('rejects a PSIC class outside the chosen industry before inserting the unit', async () => {
    const { query, save } = setup(false, false);
    await expect(save()).rejects.toThrow('Select a PSIC class belonging to the chosen Type of Unit.');
    expect(query.mock.calls.some(([sql]) => sql.includes('INSERT INTO industrial_units'))).toBe(false);
  });
});