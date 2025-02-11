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




const PDFDocument = require('pdfkit');

const generateChallanPDF = (challan) => {
  return new Promise((resolve, reject) => {
    try {
      // Create document with A4 size
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

      // Add border to the page
      doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).stroke();

      // Company Logo (using text as placeholder)
      doc.fontSize(20).text('O', 240, 60);
      
      // Company Name
      doc.fontSize(16).text('OPTIMA POLYPLAST LLP', { align: 'center' });
      
      // Company Address
      doc.fontSize(8).text('Plot No. 12, 29k, Industrial Road, Near Umiya Battery,\nMota Jalundra Industrial Zone, Dehgam, Gandhinagar,\nMo. 9274663857', {
        align: 'center',
        lineGap: 2
      });

      // Certification logos and text (positioned on left and right)
      doc.fontSize(8);
      doc.text('aqa+', 50, 120);
      doc.text('REVA', doc.page.width - 80, 120);
      doc.text('ISO 9001:2015 Certified Company', doc.page.width/2 - 60, 120);

      // Challan details table
      doc.fontSize(10);
      const detailsTop = 160;
      
      // Draw details table
      doc.rect(50, detailsTop, doc.page.width - 100, 50).stroke();
      doc.moveTo(doc.page.width/2, detailsTop).lineTo(doc.page.width/2, detailsTop + 50).stroke();
      doc.moveTo(50, detailsTop + 25).lineTo(doc.page.width - 50, detailsTop + 25).stroke();

      // Add details content
      doc.text('D.C. No.:', 60, detailsTop + 5);
      doc.text(challan.dcNo, 120, detailsTop + 5);
      doc.text('INVOICE No.:', doc.page.width/2 + 10, detailsTop + 5);
      doc.text(challan.invoiceNo, doc.page.width/2 + 80, detailsTop + 5);

      doc.text('Date:', 60, detailsTop + 30);
      doc.text(new Date(challan.date).toLocaleDateString(), 120, detailsTop + 30);
      doc.text('Vehicle No.:', doc.page.width/2 + 10, detailsTop + 30);
      doc.text(challan.vehicleNo, doc.page.width/2 + 80, detailsTop + 30);

      // Add Mr/Mrs line
      doc.text('Mr/Mrs', 50, detailsTop + 70);
      doc.moveTo(90, detailsTop + 85).lineTo(doc.page.width - 50, detailsTop + 85).stroke();

      // Items table
      const tableTop = detailsTop + 100;
      const tableHeaders = ['Sr. No', 'Descriptions', 'Quantity', 'Rate', 'Amount'];
      const columnWidths = [40, 200, 80, 80, 80];
      let currentY = tableTop;

      // Draw table headers
      doc.rect(50, tableTop, doc.page.width - 100, 25).stroke();
      let currentX = 50;
      tableHeaders.forEach((header, i) => {
        doc.text(header, currentX + 5, tableTop + 8);
        currentX += columnWidths[i];
        if (i < tableHeaders.length - 1) {
          doc.moveTo(currentX, tableTop).lineTo(currentX, tableTop + 400).stroke();
        }
      });

      // Draw table rows (12 rows)
      currentY = tableTop + 25;
      for (let i = 0; i < 12; i++) {
        doc.rect(50, currentY, doc.page.width - 100, 25).stroke();
        doc.text((i + 1).toString(), 55, currentY + 8);
        
        // Add item data if available
        if (challan.items && challan.items[i]) {
          const item = challan.items[i];
          doc.text(item.description, 95, currentY + 8);
          doc.text(item.quantity.toString(), 290, currentY + 8);
          doc.text(item.rate.toString(), 370, currentY + 8);
          doc.text(item.amount.toString(), 450, currentY + 8);
        }
        currentY += 25;
      }

      // Add total
      doc.text('Total', 55, currentY + 8);
      doc.text(`${challan.totalAmount}/-`, 450, currentY + 8);

      // Add signature fields
      currentY += 50;
      doc.text('Signature', 50, currentY);
      doc.text("Receiver's Sign", doc.page.width - 150, currentY);
      doc.text('Name:', doc.page.width - 150, currentY + 20);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = generateChallanPDF;