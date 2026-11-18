import { surveyAnswerFormatError } from './sync-validation';

describe('sync answer format validation', () => {
  it('rejects invalid text, phone, and email values with field-specific reasons', () => {
    expect(surveyAnswerFormatError('A_CONTACT', { contact_name: 'x'.repeat(121) }))
      .toBe('Contact person must be 120 characters or fewer.');
    expect(surveyAnswerFormatError('A_CONTACT', { contact_phone: '12345' }))
      .toBe('Mobile number must contain exactly 11 digits.');
    expect(surveyAnswerFormatError('A_CONTACT', { contact_email: 'not-an-email' }))
      .toBe('Email must be a valid email address.');
  });

  it('uses the database establishment-year range rather than the UI current-year cap', () => {
    expect(surveyAnswerFormatError('A_ESTABLISHMENT_YEAR', { establishment_year: 2100 })).toBeNull();
    expect(surveyAnswerFormatError('A_ESTABLISHMENT_YEAR', { establishment_year: 2101 }))
      .toBe('Year of establishment must be a whole number between 1800 and 2100.');
  });

  it('rejects malformed repeatable answers before they reach persistence', () => {
    expect(surveyAnswerFormatError('C_PRODUCTS', { product_name: 1 }))
      .toBe('Answer must be a list of entries.');
  });
});
