//jshint esversion:8

const invoice = require("../util/invoice");
const contract = require("../util/contract");
const EventModel = require('../model/event');
const BandModel = require('../model/band');
const pdfCreator = require("../util/pdf-creator");
const dateFormatter = require("../util/date-formatter");
const s3 = require("../util/s3-filemanager");
const numeral = require("numeral");
const logger = require('../config/log4');


class BasicController {

  constructor() {

    //Formatierungs-Default-Werte festlegen
    numeral.register("locale", "de", {
      delimiters: {
        thousands: ".",
        decimal: ","
      },
      abbreviations: {
        thousand: 'k',
        million: 'm',
        billion: 'b',
        trillion: 't'
      },
      ordinal: function (number) {
        return ".";
      },
      currency: {
        symbol: "€"
      }
    });
    numeral.locale("de");
    numeral.defaultFormat("0,0.00 $");
  }

  async createInvoice(req, res) {
    // for band
    var BandModel = require('../model/band');
    const bandtype = req.body.bandtype;
    var invoiceLast = req.body.invoice;
    // for invoice
    const organizerName = req.body.organizerName;
    const organizerName2 = req.body.organizerName2;
    const organizerStreetAndHouseNumber = req.body.organizerStreetAndHouseNumber;
    const organizerZip = req.body.organizerZip;
    const organizerCity = req.body.organizerCity;
    const currentDate = new Date();
    const invoiceNumber = dateFormatter.dateToString(currentDate);
    let eventDate = new Date(req.body.eventDate);
    let invoiceDate = (currentDate < eventDate) ? eventDate : currentDate;
    let serviceDate = dateFormatter.dateToGermanDateString(eventDate);
    invoiceDate = dateFormatter.dateToGermanDateString(invoiceDate);
    const eventName = req.body.eventName;
    const eventCity = req.body.eventCity;

    // Daten zur Rechnungsstellung
    const differentBillingAddress = req.body.differentBillingAddress;

    let address;

    if (differentBillingAddress === 'false') {
      address = {
        billingName: organizerName,
        billingName2: organizerName,
        billingStreetAndHouseNumber: organizerStreetAndHouseNumber,
        billingZip: organizerZip,
        billingCity: organizerCity
      };
    } else {
      address = {
        billingName: req.body.billingName,
        billingStreetAndHouseNumber: req.body.billingStreetAndHouseNumber,
        billingZip: req.body.billingZip,
        billingCity: req.body.billingCity
      };
    }

    let grossPrice = Number.parseFloat(req.body.price);
    let netPrice = (grossPrice / 1.07);
    let vat = (netPrice * 0.07);

    grossPrice = numeral(grossPrice).format();
    netPrice = numeral(netPrice).format();
    vat = numeral(vat).format();

    let band = await BandModel.findOne({
      name: bandtype
    });

    // PDF generieren
    let invoiceInfo = invoiceNumber.slice(2, 4) + '/' + invoiceLast;
    let doc = invoice.createInvoice(address, invoiceInfo, invoiceDate, serviceDate, eventName, eventCity, netPrice, vat, grossPrice, band.invoice);
    await pdfCreator.createPdf(doc, async function (binary) {
      let fileKey = "tets/invoices/" + dateFormatter.dateToString(eventDate) + "_" + req.body.eventCity + "_Rechnung.pdf";

      // // PDF in Amazon AWS S3 speichern
      // s3.upload(binary, fileKey, function (err, data) {
      //     if (err) {
      //         res.send(`Error: ${err}`);
      //     } else {
      //         // Und an den Client senden
      res.contentType('application/pdf');
      res.attachment(fileKey);
      res.send(binary);
      // }
      //  });

      //save the invoice number into DB
      await BandModel.updateOne({
        'name': bandtype
      }, {
        $set: {
          lastInvoiceNumber: parseInt(invoiceLast) + 1
        }
      });
    }, function (err) {
      logger.error.error('Creating invoice failed', err);
      res.json({
        status: false,
        error: `Error: ${err}`
      });
    });
  }

  //Create pdf not store in DB
  async createInvoicePreview(req, res) {


    // for band
    var BandModel = require('../model/band');
    const bandtype = req.body.bandtype;
    var invoiceLast = req.body.invoice;
    // for invoice
    const organizerName = req.body.organizerName;
    const organizerName2 = req.body.organizerName2;
    const organizerStreetAndHouseNumber = req.body.organizerStreetAndHouseNumber;
    const organizerZip = req.body.organizerZip;
    const organizerCity = req.body.organizerCity;
    const currentDate = new Date();
    const invoiceNumber = dateFormatter.dateToString(currentDate);
    let eventDate = new Date(req.body.eventDate);
    let invoiceDate = (currentDate < eventDate) ? eventDate : currentDate;
    let serviceDate = dateFormatter.dateToGermanDateString(eventDate);
    invoiceDate = dateFormatter.dateToGermanDateString(invoiceDate);
    const eventName = req.body.eventName;
    const eventCity = req.body.eventCity;

    // Daten zur Rechnungsstellung
    const differentBillingAddress = req.body.differentBillingAddress;

    let address;

    if (differentBillingAddress === 'false') {
      address = {
        billingName: organizerName,
        billingName2: organizerName,
        billingStreetAndHouseNumber: organizerStreetAndHouseNumber,
        billingZip: organizerZip,
        billingCity: organizerCity
      };
    } else {
      address = {
        billingName: req.body.billingName,
        billingStreetAndHouseNumber: req.body.billingStreetAndHouseNumber,
        billingZip: req.body.billingZip,
        billingCity: req.body.billingCity
      };
    }

    let grossPrice = Number.parseFloat(req.body.price);
    let netPrice = (grossPrice / 1.07);
    let vat = (netPrice * 0.07);

    grossPrice = numeral(grossPrice).format();
    netPrice = numeral(netPrice).format();
    vat = numeral(vat).format();

    // PDF generieren
    let invoiceInfo =  invoiceNumber.slice(2,4) + '/' + invoiceLast;

    let band = await BandModel.findOne({
      name: bandtype
    });
    let doc = await invoice.createInvoice(address, invoiceInfo, invoiceDate, serviceDate, eventName, eventCity, netPrice, vat, grossPrice, band.invoice);
    // console.log(doc);
    await pdfCreator.createPdf(doc, async function(binary) {
      let fileKey = "tets/invoices/" + dateFormatter.dateToString(eventDate) + "_" + req.body.eventCity + "_Rechnung.pdf";

      // // PDF in Amazon AWS S3 speichern
      // s3.upload(binary, fileKey, function (err, data) {
      //     if (err) {
      //         res.send(`Error: ${err}`);
      //     } else {
      //         // Und an den Client senden
      res.contentType('application/pdf');
      res.attachment(fileKey);
      res.send(binary);
      // }
      //  });

      //save the invoice number into DB
    }, function(err) {
      logger.error.error('Creating invoice failed', err);
      res.json({
        status: false,
        error: `Error: ${err}`
      });
    });
  }

  async createContract(req, res) {
    let bandtype = req.body.bandtype;
    // Vertragsdatum

    let contractDate = dateFormatter.dateToGermanDateString(new Date());

    let eventDate = new Date(req.body.eventDate);

    // Eventdaten zur Vertragserstellung
    let event = {
      organizerName: req.body.organizerName,
      organizerStreetAndHouseNumber: req.body.organizerStreetAndHouseNumber,
      organizerZip: req.body.organizerZip,
      organizerCity: req.body.organizerCity,
      // organizerPhone: req.body.organizerPhone,
      // organizerEmail: req.body.organizerEmail,
      price: numeral(req.body.price).format(),
      location: req.body.eventLocation,
      streetAndHouseNumber: req.body.eventStreetAndHouseNumber,
      zip: req.body.eventZip,
      city: req.body.eventCity,
      date: dateFormatter.getWeekdayName(eventDate) + ' ' + dateFormatter.dateToGermanDateString(eventDate),
      showtimeStart: req.body.showtimeStart,
      showtimeEnd: req.body.showtimeEnd,
      soundAndLightProvider: req.body.soundAndLightRadios
    };

    let band = await BandModel.findOne({
      name: bandtype
    });

    let doc = await contract.createContract(event, contractDate, band.contract);
    console.log(doc);
    pdfCreator.createPdf(doc, function (binary) {
      let fileKey = "tets/contracts/" + dateFormatter.dateToString(eventDate) + "_" + req.body.eventCity + "_Vertrag.pdf";

      // // PDF in Amazon AWS S3 speichern
      // s3.upload(binary, fileKey, function (err, data) {
      //     if (err) {
      //         res.send(`Error: ${err}`);
      //     } else {
      //         // Und an den Client senden
      res.contentType('application/pdf');
      res.attachment(fileKey);
      res.send(binary); //do nothing
      // }
      //  });
    }, function (err) {
      logger.error.error('Creating ics is failed', err);
      res.send(`Error: ${err}`);
    });
  }

  fileDownload(req, res) {
    let fileKey = "tets/invoices/" + dateFormatter.dateToString(new Date()) + "_Rechnung.pdf";

    s3.download(fileKey, function (err, data) {
      if (err) {
        logger.error.error('S3 Download error', err);
        res.send(err);
      } else {
        // Und an den Client senden
        res.contentType('application/pdf');
        res.attachment(fileKey);
        res.send(data);
      }
    });
  }

}
module.exports = BasicController;
