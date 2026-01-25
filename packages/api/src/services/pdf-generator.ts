/**
 * Credit Application PDF Generator Service
 *
 * Generates a filled credit application PDF by filling form fields
 * and overlaying signature images on the template PDF.
 *
 * Uses native PDF AcroForm fields for text and checkboxes (more reliable than coordinate-based drawing).
 * Signature images are still embedded at specific coordinates as pdf-lib has limited signature field support.
 */

import { PDFDocument, PDFPage } from 'pdf-lib';
import {
  CHECKBOX_FIELDS,
  TEXT_FIELDS,
  SIGNATURE_COORDINATES,
  SignatureCoordinate,
} from './pdf-field-mapping';

// ============================================================================
// R2 Template Configuration
// ============================================================================

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';
const PDF_TEMPLATE_PATH = 'templates/credit-application-template.pdf';

// Template cache to avoid repeated fetches
let cachedTemplateBytes: Uint8Array | null = null;

/**
 * Fetch PDF template from R2 storage
 * Caches the template in memory after first fetch
 */
async function fetchPdfTemplate(): Promise<Uint8Array> {
  // Return cached template if available
  if (cachedTemplateBytes) {
    return cachedTemplateBytes;
  }

  if (!R2_PUBLIC_URL) {
    throw new Error('R2_PUBLIC_URL environment variable is not configured');
  }

  const templateUrl = `${R2_PUBLIC_URL}/${PDF_TEMPLATE_PATH}`;

  const response = await fetch(templateUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch PDF template from ${templateUrl}: ${response.status} ${response.statusText}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  cachedTemplateBytes = new Uint8Array(arrayBuffer);

  return cachedTemplateBytes;
}

// ============================================================================
// Types
// ============================================================================

interface DirectorData {
  familyName: string;
  givenNames: string;
  residentialAddress: {
    street: string;
    suburb: string;
    state: string;
    postcode: string;
  };
  dateOfBirth: Date | string;
  driverLicenseNumber: string;
  licenseState: string;
  licenseExpiry: Date | string;
  position?: string;
}

interface SignatureData {
  directorIndex: number;
  applicantSignatureUrl: string;
  applicantSignedAt: Date;
  guarantorSignatureUrl: string;
  guarantorSignedAt: Date;
  witnessName: string;
  witnessSignatureUrl: string;
  witnessSignedAt: Date;
}

interface TradeReference {
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
}

interface FinancialDetails {
  bankName: string;
  accountName: string;
  bsb: string;
  accountNumber: string;
}

export interface CreditApplicationPdfData {
  // Business info
  accountType: 'sole_trader' | 'partnership' | 'company' | 'other';
  accountTypeOther?: string;
  businessName: string;
  abn: string;
  acn?: string;
  tradingName?: string;
  deliveryAddress: {
    street: string;
    suburb: string;
    state: string;
    postcode: string;
  };
  postalAddress?: {
    street: string;
    suburb: string;
    state: string;
    postcode: string;
  };
  contactFirstName: string;
  contactLastName: string;
  contactPhone: string;
  contactMobile?: string;
  contactEmail: string;
  businessType?: string;
  requestedCreditLimit?: number; // in cents
  forecastPurchaseAmount?: number; // in cents

  // Directors (max 3)
  directors: DirectorData[];

  // Financial
  financialDetails?: FinancialDetails;

  // Trade reference (max 1)
  tradeReferences?: TradeReference[];

  // Signatures
  signatures: SignatureData[];

  // Submission date
  submissionDate: Date;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format currency from cents to display string
 */
function formatCurrency(cents: number | undefined): string {
  if (cents === undefined || cents === null) return '';
  return `$${(cents / 100).toLocaleString('en-AU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format address to single line
 */
function formatAddress(addr?: { street: string; suburb: string; state: string; postcode: string }): string {
  if (!addr) return '';
  return `${addr.street}, ${addr.suburb} ${addr.state} ${addr.postcode}`;
}

/**
 * Format date to Australian format (DD/MM/YYYY)
 */
function formatDate(date: Date | string | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Fetch image from URL and return as Buffer
 */
async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Failed to fetch image from ${url}: ${response.status}`);
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.warn(`Error fetching image from ${url}:`, error);
    return null;
  }
}

/**
 * Embed a signature image on the PDF page
 */
async function embedSignature(
  pdfDoc: PDFDocument,
  page: PDFPage,
  signatureUrl: string,
  coords: SignatureCoordinate
): Promise<void> {
  if (!signatureUrl) return;

  try {
    const imageBuffer = await fetchImageBuffer(signatureUrl);
    if (!imageBuffer) return;

    // Detect image type and embed
    let image;
    const isPng = signatureUrl.toLowerCase().includes('.png') ||
      imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50; // PNG magic bytes

    if (isPng) {
      image = await pdfDoc.embedPng(imageBuffer);
    } else {
      // Try JPEG
      image = await pdfDoc.embedJpg(imageBuffer);
    }

    // Scale to fit the signature box while maintaining aspect ratio
    const aspectRatio = image.width / image.height;
    let drawWidth = coords.width;
    let drawHeight = coords.height;

    if (aspectRatio > coords.width / coords.height) {
      // Image is wider than box
      drawHeight = drawWidth / aspectRatio;
    } else {
      // Image is taller than box
      drawWidth = drawHeight * aspectRatio;
    }

    page.drawImage(image, {
      x: coords.x,
      y: coords.y,
      width: drawWidth,
      height: drawHeight,
    });
  } catch (error) {
    console.warn(`Error embedding signature from ${signatureUrl}:`, error);
  }
}

// ============================================================================
// Form Field Helpers
// ============================================================================

/**
 * Safely set a text field value
 */
function setTextField(
  form: ReturnType<PDFDocument['getForm']>,
  fieldName: string,
  value: string | undefined | null
): void {
  if (!value) return;
  try {
    const field = form.getTextField(fieldName);
    field.setText(value);
  } catch (error) {
    console.warn(`Failed to set text field '${fieldName}':`, error);
  }
}

/**
 * Safely check a checkbox
 */
function setCheckbox(
  form: ReturnType<PDFDocument['getForm']>,
  fieldName: string,
  checked: boolean
): void {
  if (!checked) return;
  try {
    const field = form.getCheckBox(fieldName);
    field.check();
  } catch (error) {
    console.warn(`Failed to check checkbox '${fieldName}':`, error);
  }
}

// ============================================================================
// Main PDF Generator
// ============================================================================

/**
 * Generate a filled credit application PDF
 *
 * Uses native PDF form field filling for reliable, maintainable output.
 * Signature images are embedded at specific coordinates.
 *
 * @param data - Customer credit application data
 * @returns PDF bytes as Uint8Array
 */
export async function generateCreditApplicationPdf(
  data: CreditApplicationPdfData
): Promise<Uint8Array> {
  // Fetch template from R2 storage
  const templateBytes = await fetchPdfTemplate();
  const pdfDoc = await PDFDocument.load(templateBytes);

  // Get the form object
  const form = pdfDoc.getForm();

  // Get pages for signature embedding
  const pages = pdfDoc.getPages();
  const page6 = pages[5]; // Applicant signatures
  const page8 = pages[7]; // Guarantor signatures

  // ============================================================================
  // Account Type Checkboxes
  // ============================================================================
  setCheckbox(form, CHECKBOX_FIELDS.accountTypeSoleTrader, data.accountType === 'sole_trader');
  setCheckbox(form, CHECKBOX_FIELDS.accountTypePartnership, data.accountType === 'partnership');
  setCheckbox(form, CHECKBOX_FIELDS.accountTypeCompany, data.accountType === 'company');
  setCheckbox(form, CHECKBOX_FIELDS.accountTypeOther, data.accountType === 'other');
  if (data.accountType === 'other' && data.accountTypeOther) {
    setTextField(form, TEXT_FIELDS.accountTypeOtherText, data.accountTypeOther);
  }

  // ============================================================================
  // Applicant Details
  // ============================================================================
  setTextField(form, TEXT_FIELDS.registeredName, data.businessName);
  setTextField(form, TEXT_FIELDS.abn, data.abn);
  setTextField(form, TEXT_FIELDS.acn, data.acn);
  setTextField(form, TEXT_FIELDS.tradingName, data.tradingName);
  setTextField(form, TEXT_FIELDS.tradingAddress, formatAddress(data.deliveryAddress));
  setTextField(form, TEXT_FIELDS.postalAddress, formatAddress(data.postalAddress));
  setTextField(form, TEXT_FIELDS.preferredContact, `${data.contactFirstName} ${data.contactLastName}`);
  setTextField(form, TEXT_FIELDS.position, data.directors[0]?.position || 'Director');
  setTextField(form, TEXT_FIELDS.contactNumber, data.contactPhone);
  setTextField(form, TEXT_FIELDS.mobile, data.contactMobile);
  setTextField(form, TEXT_FIELDS.emailAddress, data.contactEmail);
  setTextField(form, TEXT_FIELDS.businessType, data.businessType);
  setTextField(form, TEXT_FIELDS.creditLimit, formatCurrency(data.requestedCreditLimit));
  setTextField(form, TEXT_FIELDS.forecastPurchase, formatCurrency(data.forecastPurchaseAmount));

  // ============================================================================
  // Director 1
  // ============================================================================
  if (data.directors[0]) {
    const d1 = data.directors[0];
    setTextField(form, TEXT_FIELDS.applicant1FamilyName, d1.familyName);
    setTextField(form, TEXT_FIELDS.applicant1GivenNames, d1.givenNames);
    setTextField(form, TEXT_FIELDS.applicant1ResidentialAddress, formatAddress(d1.residentialAddress));
    setTextField(form, TEXT_FIELDS.applicant1DateOfBirth, formatDate(d1.dateOfBirth));
    setTextField(form, TEXT_FIELDS.applicant1LicenseNo, d1.driverLicenseNumber);
    setTextField(form, TEXT_FIELDS.applicant1StateOfIssue, d1.licenseState);
    setTextField(form, TEXT_FIELDS.applicant1ExpiryDate, formatDate(d1.licenseExpiry));
  }

  // ============================================================================
  // Director 2
  // ============================================================================
  if (data.directors[1]) {
    const d2 = data.directors[1];
    setTextField(form, TEXT_FIELDS.applicant2FamilyName, d2.familyName);
    setTextField(form, TEXT_FIELDS.applicant2GivenNames, d2.givenNames);
    setTextField(form, TEXT_FIELDS.applicant2ResidentialAddress, formatAddress(d2.residentialAddress));
    setTextField(form, TEXT_FIELDS.applicant2DateOfBirth, formatDate(d2.dateOfBirth));
    setTextField(form, TEXT_FIELDS.applicant2LicenseNo, d2.driverLicenseNumber);
    setTextField(form, TEXT_FIELDS.applicant2StateOfIssue, d2.licenseState);
    setTextField(form, TEXT_FIELDS.applicant2ExpiryDate, formatDate(d2.licenseExpiry));
  }

  // ============================================================================
  // Director 3
  // ============================================================================
  if (data.directors[2]) {
    const d3 = data.directors[2];
    setTextField(form, TEXT_FIELDS.applicant3FamilyName, d3.familyName);
    setTextField(form, TEXT_FIELDS.applicant3GivenNames, d3.givenNames);
    setTextField(form, TEXT_FIELDS.applicant3ResidentialAddress, formatAddress(d3.residentialAddress));
    setTextField(form, TEXT_FIELDS.applicant3DateOfBirth, formatDate(d3.dateOfBirth));
    setTextField(form, TEXT_FIELDS.applicant3LicenseNo, d3.driverLicenseNumber);
    setTextField(form, TEXT_FIELDS.applicant3StateOfIssue, d3.licenseState);
    setTextField(form, TEXT_FIELDS.applicant3ExpiryDate, formatDate(d3.licenseExpiry));
  }

  // ============================================================================
  // Financial Details
  // ============================================================================
  if (data.financialDetails) {
    const fin = data.financialDetails;
    setTextField(form, TEXT_FIELDS.bankName, fin.bankName);
    setTextField(form, TEXT_FIELDS.accountName, fin.accountName);
    setTextField(form, TEXT_FIELDS.bsb, fin.bsb);
    setTextField(form, TEXT_FIELDS.accountNumber, fin.accountNumber);
  }

  // ============================================================================
  // Trade Reference
  // ============================================================================
  if (data.tradeReferences && data.tradeReferences[0]) {
    const ref = data.tradeReferences[0];
    setTextField(form, TEXT_FIELDS.tradeRefCompanyName, ref.companyName);
    setTextField(form, TEXT_FIELDS.tradeRefContactPerson, ref.contactPerson);
    setTextField(form, TEXT_FIELDS.tradeRefPhone, ref.phone);
    setTextField(form, TEXT_FIELDS.tradeRefEmail, ref.email);
  }

  // ============================================================================
  // Page 6 - Applicant Signatures
  // ============================================================================
  for (const sig of data.signatures) {
    const directorIndex = sig.directorIndex;
    const director = data.directors[directorIndex];
    if (!director) continue;

    const fullName = `${director.givenNames} ${director.familyName}`;
    const position = director.position || 'Director';
    const signedDate = formatDate(sig.applicantSignedAt);

    if (directorIndex === 0) {
      // Applicant 1
      setTextField(form, TEXT_FIELDS.sig1Name, fullName);
      setTextField(form, TEXT_FIELDS.sig1Position, position);
      setTextField(form, TEXT_FIELDS.sig1Date, signedDate);
      await embedSignature(pdfDoc, page6, sig.applicantSignatureUrl, SIGNATURE_COORDINATES.applicant1Signature);
    } else if (directorIndex === 1) {
      // Applicant 2
      setTextField(form, TEXT_FIELDS.sig2Name, fullName);
      setTextField(form, TEXT_FIELDS.sig2Position, position);
      setTextField(form, TEXT_FIELDS.sig2Date, signedDate);
      await embedSignature(pdfDoc, page6, sig.applicantSignatureUrl, SIGNATURE_COORDINATES.applicant2Signature);
    } else if (directorIndex === 2) {
      // Applicant 3
      setTextField(form, TEXT_FIELDS.sig3Name, fullName);
      setTextField(form, TEXT_FIELDS.sig3Position, position);
      setTextField(form, TEXT_FIELDS.sig3Date, signedDate);
      await embedSignature(pdfDoc, page6, sig.applicantSignatureUrl, SIGNATURE_COORDINATES.applicant3Signature);
    }
  }

  // ============================================================================
  // Page 7 - Guarantee Header
  // ============================================================================
  setTextField(form, TEXT_FIELDS.guaranteeApplicantName, data.businessName);
  setTextField(form, TEXT_FIELDS.guaranteeApplicantABN, data.abn);

  // ============================================================================
  // Page 8 - Guarantor Signatures
  // ============================================================================
  let guarantorIndex = 0;
  for (const sig of data.signatures) {
    const director = data.directors[sig.directorIndex];
    if (!director) continue;

    const guarantorName = `${director.givenNames} ${director.familyName}`;
    const guarantorSignedDate = formatDate(sig.guarantorSignedAt);
    const witnessSignedDate = formatDate(sig.witnessSignedAt);

    if (guarantorIndex === 0) {
      // Guarantor 1
      setTextField(form, TEXT_FIELDS.guarantor1Name, guarantorName);
      setTextField(form, TEXT_FIELDS.guarantor1Date, guarantorSignedDate);
      setTextField(form, TEXT_FIELDS.witness1Name, sig.witnessName);
      setTextField(form, TEXT_FIELDS.witness1Date, witnessSignedDate);
      await embedSignature(pdfDoc, page8, sig.guarantorSignatureUrl, SIGNATURE_COORDINATES.guarantor1Signature);
      await embedSignature(pdfDoc, page8, sig.witnessSignatureUrl, SIGNATURE_COORDINATES.witness1Signature);
    } else if (guarantorIndex === 1) {
      // Guarantor 2
      setTextField(form, TEXT_FIELDS.guarantor2Name, guarantorName);
      setTextField(form, TEXT_FIELDS.guarantor2Date, guarantorSignedDate);
      setTextField(form, TEXT_FIELDS.witness2Name, sig.witnessName);
      setTextField(form, TEXT_FIELDS.witness2Date, witnessSignedDate);
      await embedSignature(pdfDoc, page8, sig.guarantorSignatureUrl, SIGNATURE_COORDINATES.guarantor2Signature);
      await embedSignature(pdfDoc, page8, sig.witnessSignatureUrl, SIGNATURE_COORDINATES.witness2Signature);
    }
    // Note: Template only supports 2 guarantors on page 8

    guarantorIndex++;
  }

  // Flatten the form to make fields non-editable
  form.flatten();

  // Save and return PDF bytes
  return pdfDoc.save();
}

/**
 * Export types for use in other modules
 */
export type { DirectorData, SignatureData, TradeReference, FinancialDetails };
