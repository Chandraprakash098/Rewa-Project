const PDFDocument = require('pdfkit');

const generateChallanPDF = (challan) => {
  return new Promise((resolve, reject) => {
    try {
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

      // Add company header
      doc.fontSize(16).text('OPTIMA POLYPLAST LLP', { align: 'center' });
      doc.fontSize(10).text(challan.companyDetails.address, { align: 'center' });
      doc.moveDown();
      
      // Add certifications
      challan.companyDetails.certifications.forEach(cert => {
        doc.fontSize(8).text(cert, { align: 'center' });
      });
      
      doc.moveDown();
      doc.fontSize(14).text('DELIVERY CHALLAN', { align: 'center' });
      doc.moveDown();

      // Challan details
      doc.fontSize(10);
      doc.text(`Challan No: ${challan.dcNo}`);
      doc.text(`Date: ${new Date(challan.date).toLocaleDateString()}`);
      doc.text(`Invoice No: ${challan.invoiceNo}`);
      doc.moveDown();

      // Transport details
      doc.text(`Vehicle No: ${challan.vehicleNo}`);
      doc.text(`Driver Name: ${challan.driverName}`);
      doc.text(`Mobile No: ${challan.mobileNo}`);
      doc.moveDown();

      // Items table
      const tableTop = doc.y;
      doc.font('Helvetica-Bold');
      
      // Table headers
      doc.text('Description', 50, tableTop);
      doc.text('Quantity', 250, tableTop);
      doc.text('Rate', 350, tableTop);
      doc.text('Amount', 450, tableTop);
      
      doc.font('Helvetica');
      let currentY = tableTop + 20;

      // Table content
      challan.items.forEach(item => {
        doc.text(item.description, 50, currentY);
        doc.text(item.quantity.toString(), 250, currentY);
        doc.text(item.rate.toString(), 350, currentY);
        doc.text(item.amount.toString(), 450, currentY);
        currentY += 20;
      });

      // Total amount
      doc.moveDown();
      doc.font('Helvetica-Bold');
      doc.text(`Total Amount: ₹${challan.totalAmount.toFixed(2)}`, { align: 'right' });
      
      // Signature fields
      doc.moveDown(2);
      doc.fontSize(10).font('Helvetica');
      doc.text('Receiver\'s Name: ' + (challan.receiverName || '_________________'), 50);
      doc.moveDown();
      doc.text('Signature: _________________', 50);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = generateChallanPDF;