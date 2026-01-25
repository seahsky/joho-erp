/**
 * PDF Field Coordinates for Credit Application Template
 *
 * This file defines the x,y coordinates for each fillable field on the PDF template.
 * Standard PDF coordinates start from bottom-left (0,0) and go up/right.
 * A4 dimensions: 595.28 x 841.89 points
 *
 * NOTE: These coordinates have been calibrated for the specific template.
 * If the template changes, coordinates may need adjustment.
 */

export interface FieldCoordinate {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export interface SignatureCoordinate extends FieldCoordinate {
  width: number;
  height: number;
}

export const PDF_FIELD_COORDINATES = {
  // ============================================================================
  // PAGE 1 - Application Details
  // ============================================================================
  page1: {
    // Account Type checkboxes (y ~ 715 from bottom)
    accountTypeSoleTrader: { x: 57, y: 715 },
    accountTypePartnership: { x: 155, y: 715 },
    accountTypeCompany: { x: 260, y: 715 },
    accountTypeOther: { x: 345, y: 715 },
    accountTypeOtherText: { x: 400, y: 715 },

    // Applicant Details Section
    registeredName: { x: 165, y: 688 },
    abn: { x: 55, y: 665 },
    acn: { x: 430, y: 665 },
    tradingName: { x: 165, y: 642 },
    tradingAddress: { x: 115, y: 619 },
    postalAddress: { x: 165, y: 596 },
    contactPerson: { x: 165, y: 573 },
    position: { x: 430, y: 573 },
    contactNumber: { x: 115, y: 550 },
    mobile: { x: 430, y: 550 },
    emailAddress: { x: 100, y: 527 },
    businessType: { x: 155, y: 503 },
    creditLimit: { x: 145, y: 478 },
    forecastPurchase: { x: 510, y: 478 },

    // Applicant 1 - Personal Details
    applicant1FamilyName: { x: 165, y: 428 },
    applicant1GivenNames: { x: 430, y: 428 },
    applicant1ResidentialAddress: { x: 165, y: 405 },
    applicant1DateOfBirth: { x: 115, y: 382 },
    applicant1LicenseNo: { x: 430, y: 382 },
    applicant1LicenseState: { x: 100, y: 359 },
    applicant1LicenseExpiry: { x: 430, y: 359 },

    // Applicant 2 - Personal Details
    applicant2FamilyName: { x: 165, y: 316 },
    applicant2GivenNames: { x: 430, y: 316 },
    applicant2ResidentialAddress: { x: 165, y: 293 },
    applicant2DateOfBirth: { x: 115, y: 270 },
    applicant2LicenseNo: { x: 430, y: 270 },
    applicant2LicenseState: { x: 100, y: 247 },
    applicant2LicenseExpiry: { x: 430, y: 247 },

    // Applicant 3 - Personal Details
    applicant3FamilyName: { x: 165, y: 204 },
    applicant3GivenNames: { x: 430, y: 204 },
    applicant3ResidentialAddress: { x: 165, y: 181 },
    applicant3DateOfBirth: { x: 115, y: 158 },
    applicant3LicenseNo: { x: 430, y: 158 },
    applicant3LicenseState: { x: 100, y: 135 },
    applicant3LicenseExpiry: { x: 430, y: 135 },

    // Financial Details Section
    bankName: { x: 115, y: 88 },
    accountName: { x: 115, y: 65 },
    bsb: { x: 100, y: 42 },
  },

  // Page 1 continued (bottom section - may overflow to coordinates below 0 in PDF coords)
  page1Bottom: {
    accountNumber: { x: 115, y: 819 }, // This continues at top of page accounting
    // Trade Reference
    tradeRefCompanyName: { x: 115, y: 775 },
    tradeRefContactPerson: { x: 115, y: 752 },
    tradeRefPhone: { x: 70, y: 729 },
    tradeRefEmail: { x: 300, y: 729 },
  },

  // ============================================================================
  // PAGE 6 - Applicant Signatures
  // ============================================================================
  page6: {
    // Applicant 1 Signature Section
    applicant1Name: { x: 165, y: 405 },
    applicant1Position: { x: 165, y: 380 },
    applicant1Signature: { x: 165, y: 315, width: 180, height: 50 } as SignatureCoordinate,
    applicant1Date: { x: 165, y: 280 },

    // Applicant 2 Signature Section
    applicant2Name: { x: 165, y: 235 },
    applicant2Position: { x: 165, y: 210 },
    applicant2Signature: { x: 165, y: 150, width: 180, height: 50 } as SignatureCoordinate,
    applicant2Date: { x: 165, y: 105 },

    // Applicant 3 Signature Section - positioned lower, may be at bottom
    applicant3Name: { x: 165, y: 55 },
    applicant3Position: { x: 165, y: 30 },
  },

  // Page 6 continued for applicant 3 (if overflows)
  page6Continued: {
    applicant3Signature: { x: 165, y: 766, width: 180, height: 50 } as SignatureCoordinate,
    applicant3Date: { x: 165, y: 716 },
  },

  // ============================================================================
  // PAGE 7 - Guarantee and Indemnity Header
  // ============================================================================
  page7: {
    // Applicant name in guarantee text (after "acknowledge that")
    applicantNameInText: { x: 360, y: 762 },
    // ABN in guarantee text
    abnInText: { x: 55, y: 740 },
  },

  // ============================================================================
  // PAGE 8 - Guarantor Signatures
  // ============================================================================
  page8: {
    // Guarantor 1 Section
    guarantor1Name: { x: 165, y: 693 },
    guarantor1Signature: { x: 165, y: 635, width: 180, height: 50 } as SignatureCoordinate,
    guarantor1Date: { x: 165, y: 595 },
    witness1Name: { x: 165, y: 548 },
    witness1Signature: { x: 165, y: 490, width: 180, height: 50 } as SignatureCoordinate,
    witness1Date: { x: 165, y: 450 },

    // Guarantor 2 Section
    guarantor2Name: { x: 165, y: 378 },
    guarantor2Signature: { x: 165, y: 320, width: 180, height: 50 } as SignatureCoordinate,
    guarantor2Date: { x: 165, y: 280 },
    witness2Name: { x: 165, y: 233 },
    witness2Signature: { x: 165, y: 175, width: 180, height: 50 } as SignatureCoordinate,
    witness2Date: { x: 165, y: 135 },
  },
} as const;

// Helper type for accessing coordinates
export type PageCoordinates = typeof PDF_FIELD_COORDINATES;
