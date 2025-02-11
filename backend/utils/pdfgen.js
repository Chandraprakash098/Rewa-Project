// const PDFDocument = require('pdfkit');

// const generateChallanPDF = (challan) => {
//   return new Promise((resolve, reject) => {
//     try {
//       const doc = new PDFDocument({
//         size: 'A4',
//         margin: 50
//       });

//       let buffers = [];
//       doc.on('data', buffers.push.bind(buffers));
//       doc.on('end', () => {
//         let pdfData = Buffer.concat(buffers);
//         resolve(pdfData);
//       });

//       // Add company header
//       doc.fontSize(16).text('OPTIMA POLYPLAST LLP', { align: 'center' });
//       doc.fontSize(10).text(challan.companyDetails.address, { align: 'center' });
//       doc.moveDown();
      
//       // Add certifications
//       challan.companyDetails.certifications.forEach(cert => {
//         doc.fontSize(8).text(cert, { align: 'center' });
//       });
      
//       doc.moveDown();
//       doc.fontSize(14).text('DELIVERY CHALLAN', { align: 'center' });
//       doc.moveDown();

//       // Challan details
//       doc.fontSize(10);
//       doc.text(`Challan No: ${challan.dcNo}`);
//       doc.text(`Date: ${new Date(challan.date).toLocaleDateString()}`);
//       doc.text(`Invoice No: ${challan.invoiceNo}`);
//       doc.moveDown();

//       // Transport details
//       doc.text(`Vehicle No: ${challan.vehicleNo}`);
//       doc.text(`Driver Name: ${challan.driverName}`);
//       doc.text(`Mobile No: ${challan.mobileNo}`);
//       doc.moveDown();

//       // Items table
//       const tableTop = doc.y;
//       doc.font('Helvetica-Bold');
      
//       // Table headers
//       doc.text('Description', 50, tableTop);
//       doc.text('Quantity', 250, tableTop);
//       doc.text('Rate', 350, tableTop);
//       doc.text('Amount', 450, tableTop);
      
//       doc.font('Helvetica');
//       let currentY = tableTop + 20;

//       // Table content
//       challan.items.forEach(item => {
//         doc.text(item.description, 50, currentY);
//         doc.text(item.quantity.toString(), 250, currentY);
//         doc.text(item.rate.toString(), 350, currentY);
//         doc.text(item.amount.toString(), 450, currentY);
//         currentY += 20;
//       });

//       // Total amount
//       doc.moveDown();
//       doc.font('Helvetica-Bold');
//       doc.text(`Total Amount: ₹${challan.totalAmount.toFixed(2)}`, { align: 'right' });
      
//       // Signature fields
//       doc.moveDown(2);
//       doc.fontSize(10).font('Helvetica');
//       doc.text('Receiver\'s Name: ' + (challan.receiverName || '_________________'), 50);
//       doc.moveDown();
//       doc.text('Signature: _________________', 50);

//       doc.end();
//     } catch (error) {
//       reject(error);
//     }
//   });
// };



const PDFDocument = require('pdfkit');
const fs = require('fs');

const generateChallanPDF = (challanData) => {
  return new Promise((resolve, reject) => {
    try {
      // Create PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50
      });

      let buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        let pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Add logo (assuming logo path is provided)
      if (challanData.logoPath) {
        doc.image(challanData.logoPath, 250, 50, { width: 100 });
        doc.moveDown();
      }

      // Company header
      doc.fontSize(16)
        .text('OPTIMA POLYPLAST LLP', { align: 'center' });
      
      doc.fontSize(10)
        .text('Plot No. 12, 23K Industrial Road, Near Umiya Battery,', { align: 'center' })
        .text('Mota Jalundra Industrial Zone, Detrajan, Gandhinagar,', { align: 'center' })
        .text('Mo. 9274658857', { align: 'center' });

      // ISO certification
      doc.fontSize(10)
        .text('ISO 9001:2015 Certified Company', { align: 'center' });

      doc.moveDown();

      // Create top section with details
      const topSection = {
        left: [
          { label: 'D.C. No.:', value: challanData.dcNo || '4192' },
          { label: 'Date:', value: challanData.date || '10/01/2025' }
        ],
        right: [
          { label: 'INVOICE No.:', value: challanData.invoiceNo || '122234192' },
          { label: 'Vehicle x No.:', value: challanData.vehicleNo || '2050' }
        ]
      };

      // Draw top section
      doc.font('Helvetica');
      let yPosition = 200;
      
      // Left side details
      topSection.left.forEach((item, index) => {
        doc.text(`${item.label}`, 50, yPosition + (index * 20));
        doc.text(`${item.value}`, 120, yPosition + (index * 20));
      });

      // Right side details
      topSection.right.forEach((item, index) => {
        doc.text(`${item.label}`, 300, yPosition + (index * 20));
        doc.text(`${item.value}`, 370, yPosition + (index * 20));
      });

      // Driver details
      doc.text('Driver Name:', 50, yPosition + 40);
      doc.text(challanData.driverName || 'Rahul Bhai', 120, yPosition + 40);
      doc.text('Mobile No.:', 300, yPosition + 40);
      doc.text(challanData.mobileNo || '9876543210', 370, yPosition + 40);

      // Table headers
      yPosition = 300;
      const tableHeaders = ['Sr. No', 'Descriptions', 'Quantity', 'Rate', 'Amount'];
      const columnWidths = [50, 200, 100, 100, 100];
      let xPosition = 50;

      // Draw table headers
      doc.font('Helvetica-Bold');
      tableHeaders.forEach((header, i) => {
        doc.text(header, xPosition, yPosition);
        xPosition += columnWidths[i];
      });

      // Table content
      doc.font('Helvetica');
      const tableData = [
        { description: '200 ml', quantity: '', rate: '', amount: '' },
        { description: '500 ml', quantity: '500', rate: '62', amount: '31000' },
        { description: '1 liter', quantity: '', rate: '', amount: '' },
        { description: 'Perform-', quantity: '', rate: '', amount: '' }
      ];

      // Draw table rows
      tableData.forEach((row, rowIndex) => {
        xPosition = 50;
        yPosition += 30;
        
        // Sr. No
        doc.text((rowIndex + 1).toString(), xPosition, yPosition);
        
        // Other columns
        doc.text(row.description, xPosition + columnWidths[0], yPosition);
        doc.text(row.quantity, xPosition + columnWidths[0] + columnWidths[1], yPosition);
        doc.text(row.rate, xPosition + columnWidths[0] + columnWidths[1] + columnWidths[2], yPosition);
        doc.text(row.amount, xPosition + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3], yPosition);
      });

      // Total
      doc.font('Helvetica-Bold');
      doc.text('Total', 50, yPosition + 50);
      doc.text('31000/-', 450, yPosition + 50);

      // Signature fields
      yPosition += 100;
      doc.font('Helvetica');
      doc.text('Signature', 50, yPosition);
      doc.text("Receiver's Sign", 400, yPosition);
      doc.text('Name:', 400, yPosition + 20);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = generateChallanPDF;