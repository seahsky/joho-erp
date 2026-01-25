/**
 * Script to inspect PDF form fields in the credit application template.
 * Run with: npx tsx packages/api/src/services/inspect-pdf-fields.ts
 */

import { PDFDocument } from 'pdf-lib';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Local template path
const LOCAL_TEMPLATE_PATH = resolve(__dirname, '../templates/credit-application-template.pdf');

async function inspectPdfTemplate(): Promise<void> {
  console.log(`Reading PDF template from: ${LOCAL_TEMPLATE_PATH}`);

  const templateBytes = readFileSync(LOCAL_TEMPLATE_PATH);

  console.log(`\nLoading PDF document...`);
  const pdfDoc = await PDFDocument.load(templateBytes);

  console.log(`\n=== PDF Document Info ===`);
  console.log(`Title: ${pdfDoc.getTitle() || 'N/A'}`);
  console.log(`Author: ${pdfDoc.getAuthor() || 'N/A'}`);
  console.log(`Page count: ${pdfDoc.getPageCount()}`);

  const form = pdfDoc.getForm();
  const fields = form.getFields();

  console.log(`\n=== PDF Form Fields (${fields.length} total) ===\n`);

  if (fields.length === 0) {
    console.log(
      'No form fields found in this PDF.\n' +
        'The template may not be a fillable PDF form.\n' +
        'Options:\n' +
        '  1. Create a new template with AcroForm fields using Adobe Acrobat\n' +
        '  2. Continue using manual coordinate-based text drawing'
    );
    return;
  }

  // Group fields by type
  const fieldsByType: Record<string, { name: string; details: string }[]> = {};

  for (const field of fields) {
    const typeName = field.constructor.name;
    const fieldName = field.getName();

    if (!fieldsByType[typeName]) {
      fieldsByType[typeName] = [];
    }

    let details = '';

    // Get additional details based on field type
    if (typeName === 'PDFTextField') {
      const textField = form.getTextField(fieldName);
      const text = textField.getText();
      const maxLength = textField.getMaxLength();
      details = `text="${text || ''}", maxLength=${maxLength ?? 'unlimited'}`;
    } else if (typeName === 'PDFCheckBox') {
      const checkBox = form.getCheckBox(fieldName);
      const isChecked = checkBox.isChecked();
      details = `checked=${isChecked}`;
    } else if (typeName === 'PDFRadioGroup') {
      const radioGroup = form.getRadioGroup(fieldName);
      const selected = radioGroup.getSelected();
      const options = radioGroup.getOptions();
      details = `selected="${selected || 'none'}", options=[${options.join(', ')}]`;
    } else if (typeName === 'PDFDropdown') {
      const dropdown = form.getDropdown(fieldName);
      const selected = dropdown.getSelected();
      const options = dropdown.getOptions();
      details = `selected=[${selected.join(', ')}], options=[${options.join(', ')}]`;
    }

    fieldsByType[typeName].push({ name: fieldName, details });
  }

  // Print fields grouped by type
  for (const [typeName, fieldList] of Object.entries(fieldsByType)) {
    console.log(`\n--- ${typeName} (${fieldList.length}) ---`);
    for (const { name, details } of fieldList) {
      console.log(`  ${name}${details ? ` [${details}]` : ''}`);
    }
  }

  // Generate mapping template
  console.log('\n\n=== Generated Field Mapping Template ===\n');
  console.log('// Copy this to pdf-field-mapping.ts and fill in the mappings:\n');
  console.log('export const PDF_FIELD_MAPPING = {');

  for (const field of fields) {
    const typeName = field.constructor.name;
    const fieldName = field.getName();
    const safeName = fieldName.replace(/[^a-zA-Z0-9_]/g, '_');
    console.log(`  // ${typeName}`);
    console.log(`  ${safeName}: '${fieldName}',`);
  }

  console.log('} as const;');
}

// Run the inspection
inspectPdfTemplate()
  .then(() => {
    console.log('\n\nInspection complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nError inspecting PDF:', error);
    process.exit(1);
  });
