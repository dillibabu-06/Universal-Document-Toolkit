const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');
const xlsx = require('xlsx');
const { faker } = require('@faker-js/faker');
const { createCanvas } = require('canvas');

const OUTPUT_DIR = path.join(__dirname, '..', '..', 'test-data');

const DIRS = {
  invoices: path.join(OUTPUT_DIR, 'invoices'),
  resumes: path.join(OUTPUT_DIR, 'resumes'),
  contracts: path.join(OUTPUT_DIR, 'contracts'),
  bank_statements: path.join(OUTPUT_DIR, 'bank-statements'),
  spreadsheets: path.join(OUTPUT_DIR, 'spreadsheets'),
  images: path.join(OUTPUT_DIR, 'images'),
  duplicates: path.join(OUTPUT_DIR, 'duplicates'),
  corrupted: path.join(OUTPUT_DIR, 'corrupted')
};

// Setup directories
if (fs.existsSync(OUTPUT_DIR)) {
  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
}
Object.values(DIRS).forEach(dir => fs.mkdirSync(dir, { recursive: true }));

console.log('Generating test data in', OUTPUT_DIR);

async function generateInvoices(count) {
  for (let i = 0; i < count; i++) {
    const doc = new PDFDocument();
    const filename = `Invoice_${faker.string.alphanumeric(8).toUpperCase()}.pdf`;
    const filepath = path.join(DIRS.invoices, filename);
    
    doc.pipe(fs.createWriteStream(filepath));
    
    const vendor = faker.company.name();
    const amount = faker.commerce.price({ min: 100, max: 5000, dec: 2, symbol: '$' });
    const date = faker.date.recent().toISOString().split('T')[0];
    
    doc.fontSize(24).text('INVOICE', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Vendor: ${vendor}`);
    doc.text(`Date: ${date}`);
    doc.text(`Invoice Number: INV-${faker.number.int({ min: 1000, max: 9999 })}`);
    doc.moveDown();
    doc.text(`Amount Due: ${amount}`, { underline: true });
    
    doc.end();
  }
  console.log(`Generated ${count} Invoices`);
}

async function generateResumes(count) {
  for (let i = 0; i < count; i++) {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({ text: faker.person.fullName(), heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: faker.person.jobTitle(), heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: `Email: ${faker.internet.email()}` }),
          new Paragraph({ text: "Experience", heading: HeadingLevel.HEADING_3 }),
          new Paragraph({ text: faker.lorem.paragraph() }),
          new Paragraph({ text: "Skills", heading: HeadingLevel.HEADING_3 }),
          new Paragraph({ text: faker.helpers.arrayElements(['Rust', 'React', 'TypeScript', 'Python', 'Go', 'SQL', 'AWS'], 4).join(', ') })
        ]
      }]
    });
    
    const filename = `Resume_${faker.person.lastName()}.docx`;
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(path.join(DIRS.resumes, filename), buffer);
  }
  console.log(`Generated ${count} Resumes`);
}

async function generateImages(count) {
  for (let i = 0; i < count; i++) {
    const canvas = createCanvas(800, 600);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = faker.color.rgb();
    ctx.fillRect(0, 0, 800, 600);
    
    ctx.fillStyle = '#fff';
    ctx.font = '40px Arial';
    ctx.fillText(`Receipt - ${faker.company.name()}`, 50, 100);
    ctx.fillText(`Total: $${faker.commerce.price()}`, 50, 200);
    
    const filename = `Receipt_${faker.string.alphanumeric(6)}.jpg`;
    const buffer = canvas.toBuffer('image/jpeg');
    fs.writeFileSync(path.join(DIRS.images, filename), buffer);
  }
  console.log(`Generated ${count} Images`);
}

async function generateSpreadsheets(count) {
  for (let i = 0; i < count; i++) {
    const data = [];
    data.push(['Date', 'Description', 'Amount', 'Balance']);
    let balance = 10000;
    
    for (let j = 0; j < 20; j++) {
      const amount = parseFloat(faker.commerce.price({ min: -500, max: 2000 }));
      balance += amount;
      data.push([
        faker.date.recent().toISOString().split('T')[0],
        faker.finance.transactionDescription(),
        amount,
        balance
      ]);
    }
    
    const ws = xlsx.utils.aoa_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Transactions");
    
    const filename = `Bank_Statement_${faker.date.past().getMonth() + 1}_${faker.date.past().getFullYear()}.xlsx`;
    xlsx.writeFile(wb, path.join(DIRS.bank_statements, filename));
  }
  console.log(`Generated ${count} Spreadsheets`);
}

async function generateDuplicatesAndCorrupted() {
  // Duplicates
  const sourceFiles = fs.readdirSync(DIRS.invoices);
  if (sourceFiles.length > 0) {
    for (let i = 0; i < 25; i++) {
      const source = path.join(DIRS.invoices, sourceFiles[0]); // Duplicate the first one 25 times
      fs.copyFileSync(source, path.join(DIRS.duplicates, `Duplicate_${i}_${sourceFiles[0]}`));
    }
  }
  
  // Corrupted
  for (let i = 0; i < 10; i++) {
    fs.writeFileSync(path.join(DIRS.corrupted, `Corrupted_${i}.pdf`), 'This is not a real PDF file! Buffer corrupted.');
  }
  console.log(`Generated Duplicates and Corrupted files`);
}

async function main() {
  await generateInvoices(100);
  await generateResumes(100);
  await generateImages(100);
  await generateSpreadsheets(50);
  await generateDuplicatesAndCorrupted();
  console.log('✅ Generation Complete!');
}

main().catch(console.error);
