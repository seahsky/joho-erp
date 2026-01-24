/**
 * Credit Application PDF Generator Service
 *
 * Generates a filled credit application PDF by overlaying customer data
 * and signatures on the template PDF.
 */

import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import { PDF_FIELD_COORDINATES, SignatureCoordinate } from './pdf-field-coordinates';

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
 * Draw text on a PDF page
 */
function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  fontSize: number = 10
): void {
  if (!text) return;
  page.drawText(text, {
    x,
    y,
    size: fontSize,
    font,
    color: rgb(0, 0, 0),
  });
}

/**
 * Draw a checkbox mark (X)
 */
function drawCheckbox(
  page: PDFPage,
  x: number,
  y: number,
  checked: boolean,
  font: PDFFont
): void {
  if (checked) {
    page.drawText('X', {
      x: x + 2,
      y: y - 2,
      size: 12,
      font,
      color: rgb(0, 0, 0),
    });
  }
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
// Main PDF Generator
// ============================================================================

/**
 * Generate a filled credit application PDF
 *
 * @param data - Customer credit application data
 * @returns PDF bytes as Uint8Array
 */
export async function generateCreditApplicationPdf(
  data: CreditApplicationPdfData
): Promise<Uint8Array> {
  // Load the template PDF
  const templatePath = path.join(__dirname, '../templates/credit-application-template.pdf');
  const templateBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);

  // Embed fonts
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 9;

  // Get all pages
  const pages = pdfDoc.getPages();

  // ============================================================================
  // PAGE 1 - Application Details
  // ============================================================================
  const page1 = pages[0];
  const p1 = PDF_FIELD_COORDINATES.page1;

  // Account type checkboxes
  drawCheckbox(page1, p1.accountTypeSoleTrader.x, p1.accountTypeSoleTrader.y, data.accountType === 'sole_trader', font);
  drawCheckbox(page1, p1.accountTypePartnership.x, p1.accountTypePartnership.y, data.accountType === 'partnership', font);
  drawCheckbox(page1, p1.accountTypeCompany.x, p1.accountTypeCompany.y, data.accountType === 'company', font);
  drawCheckbox(page1, p1.accountTypeOther.x, p1.accountTypeOther.y, data.accountType === 'other', font);
  if (data.accountType === 'other' && data.accountTypeOther) {
    drawText(page1, data.accountTypeOther, p1.accountTypeOtherText.x, p1.accountTypeOtherText.y, font, fontSize);
  }

  // Applicant details
  drawText(page1, data.businessName, p1.registeredName.x, p1.registeredName.y, font, fontSize);
  drawText(page1, data.abn, p1.abn.x, p1.abn.y, font, fontSize);
  drawText(page1, data.acn || '', p1.acn.x, p1.acn.y, font, fontSize);
  drawText(page1, data.tradingName || '', p1.tradingName.x, p1.tradingName.y, font, fontSize);
  drawText(page1, formatAddress(data.deliveryAddress), p1.tradingAddress.x, p1.tradingAddress.y, font, 8);
  drawText(page1, formatAddress(data.postalAddress), p1.postalAddress.x, p1.postalAddress.y, font, 8);
  drawText(page1, `${data.contactFirstName} ${data.contactLastName}`, p1.contactPerson.x, p1.contactPerson.y, font, fontSize);
  drawText(page1, data.directors[0]?.position || 'Director', p1.position.x, p1.position.y, font, fontSize);
  drawText(page1, data.contactPhone, p1.contactNumber.x, p1.contactNumber.y, font, fontSize);
  drawText(page1, data.contactMobile || '', p1.mobile.x, p1.mobile.y, font, fontSize);
  drawText(page1, data.contactEmail, p1.emailAddress.x, p1.emailAddress.y, font, 8);
  drawText(page1, data.businessType || '', p1.businessType.x, p1.businessType.y, font, fontSize);
  drawText(page1, formatCurrency(data.requestedCreditLimit), p1.creditLimit.x, p1.creditLimit.y, font, fontSize);
  drawText(page1, formatCurrency(data.forecastPurchaseAmount), p1.forecastPurchase.x, p1.forecastPurchase.y, font, fontSize);

  // Director 1
  if (data.directors[0]) {
    const d1 = data.directors[0];
    drawText(page1, d1.familyName, p1.applicant1FamilyName.x, p1.applicant1FamilyName.y, font, fontSize);
    drawText(page1, d1.givenNames, p1.applicant1GivenNames.x, p1.applicant1GivenNames.y, font, fontSize);
    drawText(page1, formatAddress(d1.residentialAddress), p1.applicant1ResidentialAddress.x, p1.applicant1ResidentialAddress.y, font, 8);
    drawText(page1, formatDate(d1.dateOfBirth), p1.applicant1DateOfBirth.x, p1.applicant1DateOfBirth.y, font, fontSize);
    drawText(page1, d1.driverLicenseNumber, p1.applicant1LicenseNo.x, p1.applicant1LicenseNo.y, font, fontSize);
    drawText(page1, d1.licenseState, p1.applicant1LicenseState.x, p1.applicant1LicenseState.y, font, fontSize);
    drawText(page1, formatDate(d1.licenseExpiry), p1.applicant1LicenseExpiry.x, p1.applicant1LicenseExpiry.y, font, fontSize);
  }

  // Director 2
  if (data.directors[1]) {
    const d2 = data.directors[1];
    drawText(page1, d2.familyName, p1.applicant2FamilyName.x, p1.applicant2FamilyName.y, font, fontSize);
    drawText(page1, d2.givenNames, p1.applicant2GivenNames.x, p1.applicant2GivenNames.y, font, fontSize);
    drawText(page1, formatAddress(d2.residentialAddress), p1.applicant2ResidentialAddress.x, p1.applicant2ResidentialAddress.y, font, 8);
    drawText(page1, formatDate(d2.dateOfBirth), p1.applicant2DateOfBirth.x, p1.applicant2DateOfBirth.y, font, fontSize);
    drawText(page1, d2.driverLicenseNumber, p1.applicant2LicenseNo.x, p1.applicant2LicenseNo.y, font, fontSize);
    drawText(page1, d2.licenseState, p1.applicant2LicenseState.x, p1.applicant2LicenseState.y, font, fontSize);
    drawText(page1, formatDate(d2.licenseExpiry), p1.applicant2LicenseExpiry.x, p1.applicant2LicenseExpiry.y, font, fontSize);
  }

  // Director 3
  if (data.directors[2]) {
    const d3 = data.directors[2];
    drawText(page1, d3.familyName, p1.applicant3FamilyName.x, p1.applicant3FamilyName.y, font, fontSize);
    drawText(page1, d3.givenNames, p1.applicant3GivenNames.x, p1.applicant3GivenNames.y, font, fontSize);
    drawText(page1, formatAddress(d3.residentialAddress), p1.applicant3ResidentialAddress.x, p1.applicant3ResidentialAddress.y, font, 8);
    drawText(page1, formatDate(d3.dateOfBirth), p1.applicant3DateOfBirth.x, p1.applicant3DateOfBirth.y, font, fontSize);
    drawText(page1, d3.driverLicenseNumber, p1.applicant3LicenseNo.x, p1.applicant3LicenseNo.y, font, fontSize);
    drawText(page1, d3.licenseState, p1.applicant3LicenseState.x, p1.applicant3LicenseState.y, font, fontSize);
    drawText(page1, formatDate(d3.licenseExpiry), p1.applicant3LicenseExpiry.x, p1.applicant3LicenseExpiry.y, font, fontSize);
  }

  // Financial details
  if (data.financialDetails) {
    const fin = data.financialDetails;
    drawText(page1, fin.bankName, p1.bankName.x, p1.bankName.y, font, fontSize);
    drawText(page1, fin.accountName, p1.accountName.x, p1.accountName.y, font, fontSize);
    drawText(page1, fin.bsb, p1.bsb.x, p1.bsb.y, font, fontSize);
    // Account number is on the bottom section
    const p1b = PDF_FIELD_COORDINATES.page1Bottom;
    drawText(page1, fin.accountNumber, p1b.accountNumber.x, p1b.accountNumber.y, font, fontSize);
  }

  // Trade reference (first one only - max 1)
  const p1b = PDF_FIELD_COORDINATES.page1Bottom;
  if (data.tradeReferences && data.tradeReferences[0]) {
    const ref = data.tradeReferences[0];
    drawText(page1, ref.companyName, p1b.tradeRefCompanyName.x, p1b.tradeRefCompanyName.y, font, fontSize);
    drawText(page1, ref.contactPerson, p1b.tradeRefContactPerson.x, p1b.tradeRefContactPerson.y, font, fontSize);
    drawText(page1, ref.phone, p1b.tradeRefPhone.x, p1b.tradeRefPhone.y, font, fontSize);
    drawText(page1, ref.email, p1b.tradeRefEmail.x, p1b.tradeRefEmail.y, font, 8);
  }

  // ============================================================================
  // PAGE 6 - Applicant Signatures
  // ============================================================================
  const page6 = pages[5];
  const p6 = PDF_FIELD_COORDINATES.page6;

  // Process signatures for each director
  for (const sig of data.signatures) {
    const directorIndex = sig.directorIndex;
    const director = data.directors[directorIndex];
    if (!director) continue;

    const fullName = `${director.givenNames} ${director.familyName}`;
    const position = director.position || 'Director';
    const signedDate = formatDate(sig.applicantSignedAt);

    if (directorIndex === 0) {
      // Applicant 1
      drawText(page6, fullName, p6.applicant1Name.x, p6.applicant1Name.y, font, fontSize);
      drawText(page6, position, p6.applicant1Position.x, p6.applicant1Position.y, font, fontSize);
      await embedSignature(pdfDoc, page6, sig.applicantSignatureUrl, p6.applicant1Signature as SignatureCoordinate);
      drawText(page6, signedDate, p6.applicant1Date.x, p6.applicant1Date.y, font, fontSize);
    } else if (directorIndex === 1) {
      // Applicant 2
      drawText(page6, fullName, p6.applicant2Name.x, p6.applicant2Name.y, font, fontSize);
      drawText(page6, position, p6.applicant2Position.x, p6.applicant2Position.y, font, fontSize);
      await embedSignature(pdfDoc, page6, sig.applicantSignatureUrl, p6.applicant2Signature as SignatureCoordinate);
      drawText(page6, signedDate, p6.applicant2Date.x, p6.applicant2Date.y, font, fontSize);
    } else if (directorIndex === 2) {
      // Applicant 3
      drawText(page6, fullName, p6.applicant3Name.x, p6.applicant3Name.y, font, fontSize);
      drawText(page6, position, p6.applicant3Position.x, p6.applicant3Position.y, font, fontSize);
      // Signature and date may be on continued section or need different handling
      const p6c = PDF_FIELD_COORDINATES.page6Continued;
      await embedSignature(pdfDoc, page6, sig.applicantSignatureUrl, p6c.applicant3Signature as SignatureCoordinate);
      drawText(page6, signedDate, p6c.applicant3Date.x, p6c.applicant3Date.y, font, fontSize);
    }
  }

  // ============================================================================
  // PAGE 7 - Guarantee Header
  // ============================================================================
  const page7 = pages[6];
  const p7 = PDF_FIELD_COORDINATES.page7;

  // Fill in applicant name and ABN in the guarantee text
  drawText(page7, data.businessName, p7.applicantNameInText.x, p7.applicantNameInText.y, font, fontSize);
  drawText(page7, data.abn, p7.abnInText.x, p7.abnInText.y, font, fontSize);

  // ============================================================================
  // PAGE 8 - Guarantor Signatures
  // ============================================================================
  const page8 = pages[7];
  const p8 = PDF_FIELD_COORDINATES.page8;

  // Process guarantor signatures (each director who signed as guarantor)
  let guarantorIndex = 0;
  for (const sig of data.signatures) {
    const director = data.directors[sig.directorIndex];
    if (!director) continue;

    const guarantorName = `${director.givenNames} ${director.familyName}`;
    const guarantorSignedDate = formatDate(sig.guarantorSignedAt);
    const witnessSignedDate = formatDate(sig.witnessSignedAt);

    if (guarantorIndex === 0) {
      // Guarantor 1
      drawText(page8, guarantorName, p8.guarantor1Name.x, p8.guarantor1Name.y, font, fontSize);
      await embedSignature(pdfDoc, page8, sig.guarantorSignatureUrl, p8.guarantor1Signature as SignatureCoordinate);
      drawText(page8, guarantorSignedDate, p8.guarantor1Date.x, p8.guarantor1Date.y, font, fontSize);
      drawText(page8, sig.witnessName, p8.witness1Name.x, p8.witness1Name.y, font, fontSize);
      await embedSignature(pdfDoc, page8, sig.witnessSignatureUrl, p8.witness1Signature as SignatureCoordinate);
      drawText(page8, witnessSignedDate, p8.witness1Date.x, p8.witness1Date.y, font, fontSize);
    } else if (guarantorIndex === 1) {
      // Guarantor 2
      drawText(page8, guarantorName, p8.guarantor2Name.x, p8.guarantor2Name.y, font, fontSize);
      await embedSignature(pdfDoc, page8, sig.guarantorSignatureUrl, p8.guarantor2Signature as SignatureCoordinate);
      drawText(page8, guarantorSignedDate, p8.guarantor2Date.x, p8.guarantor2Date.y, font, fontSize);
      drawText(page8, sig.witnessName, p8.witness2Name.x, p8.witness2Name.y, font, fontSize);
      await embedSignature(pdfDoc, page8, sig.witnessSignatureUrl, p8.witness2Signature as SignatureCoordinate);
      drawText(page8, witnessSignedDate, p8.witness2Date.x, p8.witness2Date.y, font, fontSize);
    }
    // Note: Template only supports 2 guarantors on page 8

    guarantorIndex++;
  }

  // Save and return PDF bytes
  return pdfDoc.save();
}

/**
 * Export types for use in other modules
 */
export type { DirectorData, SignatureData, TradeReference, FinancialDetails };
