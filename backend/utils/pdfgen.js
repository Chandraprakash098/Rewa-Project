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



// module.exports = generateChallanPDF;



// const PDFDocument = require('pdfkit');

// const generateChallanPDF = (challan) => {
//   return new Promise((resolve, reject) => {
//     try {
//       // Create document with A4 size
//       const doc = new PDFDocument({
//         size: 'A4',
//         margin: 40
//       });

//       let buffers = [];
//       doc.on('data', buffers.push.bind(buffers));
//       doc.on('end', () => {
//         let pdfData = Buffer.concat(buffers);
//         resolve(pdfData);
//       });

//       // Company Logo and Header
//       // Since we can't add external images, we'll create the header text
//       doc.fontSize(16).text('OPTIMA POLYPLAST LLP', { align: 'center' });
      
//       // Company Address
//       doc.fontSize(8)
//         .text('Plot No. 12, 296, Industrial Road, Near Umiya Battery,', { align: 'center' })
//         .text('Mota Jalundra Industrial Zone, Derojnagar, Gandhinagar,', { align: 'center' })
//         .text('Mo. 9274658587', { align: 'center' });

//       // Certification Line
//       doc.moveDown(0.5);
//       doc.fontSize(8).text('ISO 9001:2015 Certified Company', { align: 'center' });

//       // Draw top section boxes
//       const topSectionY = 140;
      
//       // Left side details
//       doc.fontSize(8)
//         .text('D.C. No.:', 40, topSectionY)
//         .text(challan.dcNo, 90, topSectionY)
//         .text('Date:', 40, topSectionY + 20)
//         .text(new Date(challan.date).toLocaleDateString(), 90, topSectionY + 20)
//         .text('Driver Name:', 40, topSectionY + 40)
//         .text(challan.driverName, 90, topSectionY + 40);

//       // Right side details
//       doc.text('INVOICE No.:', 300, topSectionY)
//         .text(challan.invoiceNo, 360, topSectionY)
//         .text('Vehicle No.:', 300, topSectionY + 20)
//         .text(challan.vehicleNo, 360, topSectionY + 20)
//         .text('Mobile No.:', 300, topSectionY + 40)
//         .text(challan.mobileNo, 360, topSectionY + 40);

//       // Mr/Mrs Line
//       doc.text('Mr/Mrs', 40, topSectionY + 70);

//       // Create table
//       const tableTop = topSectionY + 100;
//       const tableHeaders = ['Sr. No', 'Descriptions', 'Quantity', 'Rate', 'Amount'];
//       const columnWidths = [40, 200, 100, 100, 100];
//       const startX = 40;
//       let currentX = startX;

//       // Draw table headers with light blue background
//       doc.fillColor('#E6E6FA')
//         .rect(startX, tableTop, 540, 20)
//         .fill();

//       // Add header text
//       doc.fillColor('black');
//       tableHeaders.forEach((header, i) => {
//         doc.text(header, currentX, tableTop + 5, {
//           width: columnWidths[i],
//           align: 'center'
//         });
//         currentX += columnWidths[i];
//       });

//       // Add table rows
//       let currentY = tableTop + 20;
//       for (let i = 0; i < 12; i++) {
//         const item = challan.items[i] || {};
//         currentX = startX;
        
//         // Draw row lines
//         doc.moveTo(startX, currentY)
//            .lineTo(startX + 540, currentY)
//            .stroke();

//         // Add row content if it exists
//         if (item.description) {
//           doc.text((i + 1).toString(), currentX, currentY + 5, { width: columnWidths[0], align: 'center' })
//              .text(item.description, currentX + columnWidths[0], currentY + 5, { width: columnWidths[1], align: 'left' })
//              .text(item.quantity?.toString() || '', currentX + columnWidths[0] + columnWidths[1], currentY + 5, { width: columnWidths[2], align: 'center' })
//              .text(item.rate?.toString() || '', currentX + columnWidths[0] + columnWidths[1] + columnWidths[2], currentY + 5, { width: columnWidths[3], align: 'center' })
//              .text(item.amount?.toString() || '', currentX + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3], currentY + 5, { width: columnWidths[4], align: 'center' });
//         }
        
//         currentY += 30;
//       }

//       // Add total at bottom
//       doc.font('Helvetica-Bold')
//          .text('Total', startX, currentY + 10)
//          .text(challan.totalAmount?.toFixed(2) || '0.00', startX + 440, currentY + 10, { align: 'right' });

//       // Add signature lines at bottom
//       currentY += 50;
//       doc.font('Helvetica')
//          .text('Signature', startX, currentY)
//          .text("Receiver's Sign", startX + 440, currentY)
//          .text('Name:', startX + 440, currentY + 20);

//       // Finish document
//       doc.end();
//     } catch (error) {
//       reject(error);
//     }
//   });
// };

// module.exports = generateChallanPDF;





const PDFDocument = require('pdfkit');

const generateChallanPDF = (challan) => {
  return new Promise((resolve, reject) => {
    try {
      // Create document with A4 size
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40
      });

      let buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        let pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Company Logo and Header
      // Since we can't add external images, we'll create the header text
      doc.fontSize(16).text('OPTIMA POLYPLAST LLP', { align: 'center' });
      
      // Company Address
      doc.fontSize(8)
        .text('Plot No. 12, 296, Industrial Road, Near Umiya Battery,', { align: 'center' })
        .text('Mota Jalundra Industrial Zone, Derojnagar, Gandhinagar,', { align: 'center' })
        .text('Mo. 9274658587', { align: 'center' });

      // Certification Line
      doc.moveDown(0.5);
      doc.fontSize(8).text('ISO 9001:2015 Certified Company', { align: 'center' });

      // Draw top section boxes
      const topSectionY = 140;
      
      // Left side details - Changed DC No. to User Code
      doc.fontSize(8)
        .text('User Code:', 40, topSectionY)
        .text(challan.userCode, 90, topSectionY)
        .text('Date:', 40, topSectionY + 20)
        .text(new Date(challan.date).toLocaleDateString(), 90, topSectionY + 20)
        .text('Driver Name:', 40, topSectionY + 40)
        .text(challan.driverName, 90, topSectionY + 40);

      // Right side details
      doc.text('INVOICE No.:', 300, topSectionY)
        .text(challan.invoiceNo, 360, topSectionY)
        .text('Vehicle No.:', 300, topSectionY + 20)
        .text(challan.vehicleNo, 360, topSectionY + 20)
        .text('Mobile No.:', 300, topSectionY + 40)
        .text(challan.mobileNo, 360, topSectionY + 40);

      // Mr/Mrs Line
      doc.text('Mr/Mrs', 40, topSectionY + 70);

      // Create table
      const tableTop = topSectionY + 100;
      const tableHeaders = ['Sr. No', 'Descriptions', 'Quantity', 'Rate', 'Amount'];
      const columnWidths = [40, 200, 100, 100, 100];
      const startX = 40;
      let currentX = startX;

      // Draw table headers with light blue background
      doc.fillColor('#E6E6FA')
        .rect(startX, tableTop, 540, 20)
        .fill();

      // Add header text
      doc.fillColor('black');
      tableHeaders.forEach((header, i) => {
        doc.text(header, currentX, tableTop + 5, {
          width: columnWidths[i],
          align: 'center'
        });
        currentX += columnWidths[i];
      });

      // Add table rows
      let currentY = tableTop + 20;
      for (let i = 0; i < 12; i++) {
        const item = challan.items[i] || {};
        currentX = startX;
        
        // Draw row lines
        doc.moveTo(startX, currentY)
           .lineTo(startX + 540, currentY)
           .stroke();

        // Add row content if it exists
        if (item.description) {
          doc.text((i + 1).toString(), currentX, currentY + 5, { width: columnWidths[0], align: 'center' })
             .text(item.description, currentX + columnWidths[0], currentY + 5, { width: columnWidths[1], align: 'left' })
             .text(item.quantity?.toString() || '', currentX + columnWidths[0] + columnWidths[1], currentY + 5, { width: columnWidths[2], align: 'center' })
             .text(item.rate?.toString() || '', currentX + columnWidths[0] + columnWidths[1] + columnWidths[2], currentY + 5, { width: columnWidths[3], align: 'center' })
             .text(item.amount?.toString() || '', currentX + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3], currentY + 5, { width: columnWidths[4], align: 'center' });
        }
        
        currentY += 30;
      }

      // Add total at bottom
      doc.font('Helvetica-Bold')
         .text('Total', startX, currentY + 10)
         .text(challan.totalAmount?.toFixed(2) || '0.00', startX + 440, currentY + 10, { align: 'right' });

      // Add signature lines at bottom
      currentY += 50;
      doc.font('Helvetica')
         .text('Signature', startX, currentY)
         .text("Receiver's Sign", startX + 440, currentY)
         .text('Name:', startX + 440, currentY + 20);

      // Finish document
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = generateChallanPDF;
