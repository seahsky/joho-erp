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
    // Account Type checkboxes (y ~ 712 from bottom)
    accountTypeSoleTrader: { x: 56, y: 712 },
    accountTypePartnership: { x: 138, y: 712 },
    accountTypeCompany: { x: 230, y: 712 },
    accountTypeOther: { x: 310, y: 712 },
    accountTypeOtherText: { x: 365, y: 712 },

    // Applicant Details Section
    registeredName: { x: 150, y: 680 },
    abn: { x: 60, y: 656 },
    acn: { x: 400, y: 656 },
    tradingName: { x: 150, y: 632 },
    tradingAddress: { x: 120, y: 608 },
    postalAddress: { x: 160, y: 584 },
    contactPerson: { x: 160, y: 560 },
    position: { x: 445, y: 560 },
    contactNumber: { x: 120, y: 536 },
    mobile: { x: 445, y: 536 },
    emailAddress: { x: 110, y: 512 },
    businessType: { x: 155, y: 488 },
    creditLimit: { x: 145, y: 464 },
    forecastPurchase: { x: 455, y: 464 },

    // Applicant 1 - Personal Details
    applicant1FamilyName: { x: 150, y: 408 },
    applicant1GivenNames: { x: 420, y: 408 },
    applicant1ResidentialAddress: { x: 150, y: 384 },
    applicant1DateOfBirth: { x: 120, y: 360 },
    applicant1LicenseNo: { x: 420, y: 360 },
    applicant1LicenseState: { x: 120, y: 336 },
    applicant1LicenseExpiry: { x: 420, y: 336 },

    // Applicant 2 - Personal Details
    applicant2FamilyName: { x: 150, y: 296 },
    applicant2GivenNames: { x: 420, y: 296 },
    applicant2ResidentialAddress: { x: 150, y: 272 },
    applicant2DateOfBirth: { x: 120, y: 248 },
    applicant2LicenseNo: { x: 420, y: 248 },
    applicant2LicenseState: { x: 120, y: 224 },
    applicant2LicenseExpiry: { x: 420, y: 224 },

    // Applicant 3 - Personal Details
    applicant3FamilyName: { x: 150, y: 184 },
    applicant3GivenNames: { x: 420, y: 184 },
    applicant3ResidentialAddress: { x: 150, y: 160 },
    applicant3DateOfBirth: { x: 120, y: 136 },
    applicant3LicenseNo: { x: 420, y: 136 },
    applicant3LicenseState: { x: 120, y: 112 },
    applicant3LicenseExpiry: { x: 420, y: 112 },

    // Financial Details Section
    bankName: { x: 85, y: 68 },
    accountName: { x: 115, y: 44 },
    bsb: { x: 100, y: 20 },
  },

  // Page 1 continued (bottom section - may overflow to coordinates below 0 in PDF coords)
  page1Bottom: {
    accountNumber: { x: 120, y: 796 }, // This continues at top of page accounting
    // Trade Reference
    tradeRefCompanyName: { x: 120, y: 752 },
    tradeRefContactPerson: { x: 120, y: 728 },
    tradeRefPhone: { x: 85, y: 704 },
    tradeRefEmail: { x: 325, y: 704 },
  },

  // ============================================================================
  // PAGE 6 - Applicant Signatures
  // ============================================================================
  page6: {
    // Applicant 1 Signature Section
    applicant1Name: { x: 150, y: 392 },
    applicant1Position: { x: 150, y: 368 },
    applicant1Signature: { x: 150, y: 310, width: 180, height: 50 } as SignatureCoordinate,
    applicant1Date: { x: 150, y: 260 },

    // Applicant 2 Signature Section
    applicant2Name: { x: 150, y: 216 },
    applicant2Position: { x: 150, y: 192 },
    applicant2Signature: { x: 150, y: 134, width: 180, height: 50 } as SignatureCoordinate,
    applicant2Date: { x: 150, y: 84 },

    // Applicant 3 Signature Section - positioned lower, may be at bottom
    applicant3Name: { x: 150, y: 40 },
    applicant3Position: { x: 150, y: 16 },
  },

  // Page 6 continued for applicant 3 (if overflows)
  page6Continued: {
    applicant3Signature: { x: 150, y: 766, width: 180, height: 50 } as SignatureCoordinate,
    applicant3Date: { x: 150, y: 716 },
  },

  // ============================================================================
  // PAGE 7 - Guarantee and Indemnity Header
  // ============================================================================
  page7: {
    // Applicant name in guarantee text (after "acknowledge that")
    applicantNameInText: { x: 310, y: 752 },
    // ABN in guarantee text
    abnInText: { x: 60, y: 728 },
  },

  // ============================================================================
  // PAGE 8 - Guarantor Signatures
  // ============================================================================
  page8: {
    // Guarantor 1 Section
    guarantor1Name: { x: 180, y: 680 },
    guarantor1Signature: { x: 180, y: 624, width: 180, height: 50 } as SignatureCoordinate,
    guarantor1Date: { x: 180, y: 574 },
    witness1Name: { x: 180, y: 528 },
    witness1Signature: { x: 180, y: 472, width: 180, height: 50 } as SignatureCoordinate,
    witness1Date: { x: 180, y: 422 },

    // Guarantor 2 Section
    guarantor2Name: { x: 180, y: 360 },
    guarantor2Signature: { x: 180, y: 304, width: 180, height: 50 } as SignatureCoordinate,
    guarantor2Date: { x: 180, y: 254 },
    witness2Name: { x: 180, y: 208 },
    witness2Signature: { x: 180, y: 152, width: 180, height: 50 } as SignatureCoordinate,
    witness2Date: { x: 180, y: 102 },
  },
} as const;

// Helper type for accessing coordinates
export type PageCoordinates = typeof PDF_FIELD_COORDINATES;
