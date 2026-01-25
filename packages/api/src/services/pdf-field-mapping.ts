/**
 * PDF Form Field Mapping
 *
 * Maps application data fields to the actual PDF form field names.
 * Field names are defined in the credit-application-template.pdf AcroForm.
 *
 * To discover field names, run:
 *   npx tsx packages/api/src/services/inspect-pdf-fields.ts
 */

/**
 * Checkbox field names for account type selection
 */
export const CHECKBOX_FIELDS = {
  accountTypeSoleTrader: 'accountType_soleTrader',
  accountTypePartnership: 'accountType_partnership',
  accountTypeCompany: 'accountType_company',
  accountTypeOther: 'accountType_other',
} as const;

/**
 * Text field names grouped by section
 */
export const TEXT_FIELDS = {
  // Page 1 - Account type
  accountTypeOtherText: 'accountType_otherText',

  // Page 1 - Applicant details
  registeredName: 'registeredName',
  abn: 'abn',
  acn: 'acn',
  tradingName: 'tradingName',
  tradingAddress: 'tradingAddress',
  postalAddress: 'postalAddress',
  preferredContact: 'preferredContact', // Contact person name
  position: 'position',
  contactNumber: 'contactNumber',
  mobile: 'mobile',
  emailAddress: 'emailAddress',
  businessType: 'businessType',
  creditLimit: 'creditLimit',
  forecastPurchase: 'forecastPurchase',

  // Page 1 - Applicant 1 (Director 1)
  applicant1FamilyName: 'applicant1_familyName',
  applicant1GivenNames: 'applicant1_givenNames',
  applicant1ResidentialAddress: 'applicant1_residentialAddress',
  applicant1DateOfBirth: 'applicant1_dob',
  applicant1LicenseNo: 'applicant1_licenseNo',
  applicant1StateOfIssue: 'applicant1_stateOfIssue',
  applicant1ExpiryDate: 'applicant1_expiryDate',

  // Page 1 - Applicant 2 (Director 2)
  applicant2FamilyName: 'applicant2_familyName',
  applicant2GivenNames: 'applicant2_givenNames',
  applicant2ResidentialAddress: 'applicant2_residentialAddress',
  applicant2DateOfBirth: 'applicant2_dob',
  applicant2LicenseNo: 'applicant2_licenseNo',
  applicant2StateOfIssue: 'applicant2_stateOfIssue',
  applicant2ExpiryDate: 'applicant2_expiryDate',

  // Page 1 - Applicant 3 (Director 3)
  applicant3FamilyName: 'applicant3_familyName',
  applicant3GivenNames: 'applicant3_givenNames',
  applicant3ResidentialAddress: 'applicant3_residentialAddress',
  applicant3DateOfBirth: 'applicant3_dob',
  applicant3LicenseNo: 'applicant3_licenseNo',
  applicant3StateOfIssue: 'applicant3_stateOfIssue',
  applicant3ExpiryDate: 'applicant3_expiryDate',

  // Page 1 - Financial details
  bankName: 'bank',
  accountName: 'accountName',
  bsb: 'bsbNumber',
  accountNumber: 'accountNumber',

  // Page 1 - Trade reference
  tradeRefCompanyName: 'tradeRef_companyName',
  tradeRefContactPerson: 'tradeRef_contactPerson',
  tradeRefPhone: 'tradeRef_phone',
  tradeRefEmail: 'tradeRef_email',

  // Page 6 - Applicant signatures (text fields only, signatures are images)
  sig1Name: 'sig1_name',
  sig1Position: 'sig1_position',
  sig1Date: 'sig1_date',
  sig2Name: 'sig2_name',
  sig2Position: 'sig2_position',
  sig2Date: 'sig2_date',
  sig3Name: 'sig3_name',
  sig3Position: 'sig3_position',
  sig3Date: 'sig3_date',

  // Page 7 - Guarantee header
  guaranteeApplicantName: 'guarantee_applicantName',
  guaranteeApplicantABN: 'guarantee_applicantABN',

  // Page 8 - Guarantor signatures (text fields only, signatures are images)
  guarantor1Name: 'guarantor1_name',
  guarantor1Date: 'guarantor1_date',
  witness1Name: 'witness1_name',
  witness1Date: 'witness1_date',
  guarantor2Name: 'guarantor2_name',
  guarantor2Date: 'guarantor2_date',
  witness2Name: 'witness2_name',
  witness2Date: 'witness2_date',
} as const;

/**
 * Signature image coordinates (not form fields - embedded as images)
 * These are still needed because PDF form signature fields have limited support in pdf-lib.
 */
export interface SignatureCoordinate {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const SIGNATURE_COORDINATES = {
  // Page 6 - Applicant signatures
  applicant1Signature: { x: 165, y: 315, width: 180, height: 50 },
  applicant2Signature: { x: 165, y: 150, width: 180, height: 50 },
  applicant3Signature: { x: 165, y: 766, width: 180, height: 50 }, // Continues from page 6

  // Page 8 - Guarantor and witness signatures
  guarantor1Signature: { x: 165, y: 635, width: 180, height: 50 },
  witness1Signature: { x: 165, y: 490, width: 180, height: 50 },
  guarantor2Signature: { x: 165, y: 320, width: 180, height: 50 },
  witness2Signature: { x: 165, y: 175, width: 180, height: 50 },
} as const;

export type TextFieldKey = keyof typeof TEXT_FIELDS;
export type CheckboxFieldKey = keyof typeof CHECKBOX_FIELDS;
