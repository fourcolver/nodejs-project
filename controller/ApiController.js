//jshint esversion:8
var EventModel = require('../model/event');
var BandModel = require('../model/band');
var UserModel = require('../model/user');
var MemberModel = require('../model/member');
var logger = require('../config/log4');
var nodemailer = require('nodemailer');
const mongoose = require("mongoose");
const _ = require("lodash");
var dateFormatter = require('../util/date-formatter');
mongoose.set('useFindAndModify', false);
var bcrypt = require('bcrypt-nodejs');


class ApiController {
  // Liefert alle Events im Status "gebucht", für die der aufrufende API-Key zugelassen ist
  async getEvents(req, res) {
    let bandtypes = [];
    let req_key = req.headers.apikey;
    let datetype = req.query.datetype;

    if (!req_key) {
      res.status(401).json('Unauthorized user');
    } else {
      let isUser = await UserModel.findOne({
        apikey: req_key
      });
      if (isUser) {
        let bands = await MemberModel.find({
          email: isUser.email
        });
        if (bands.length == 0) {
          res.status(200).json('Cannot find band. Please create a new band');
        } else {
          for (let i = 0; i < bands.length; i++) {
            bandtypes.push(bands[i].bandtype);
          }


          let bandevents;
          // define start of day
          let startOfDay = new Date().setHours(0, 0, 0, 0);

          // only deliver events for the datetype specified
          if (datetype === "future") {
            bandevents = await EventModel.find({
              bandtype: bandtypes,
              status: ["Gebucht", "Vertrag versendet"],
              date: {
                $gte: startOfDay
              }
                // only deliver public fields + event type to hide private events
            }, "date name location address type").sort({
              date: 1
            });
          } else if (datetype === "past") {
            bandevents = await EventModel.find({
              bandtype: bandtypes,
              status: ["Gebucht", "Vertrag versendet"],
              date: {
                $lt: startOfDay
              }
              // only deliver public fields + event type to hide private events
            }, "date name location address type").sort({
              date: 1
            });
          } else {
            bandevents = await EventModel.find({
              bandtype: bandtypes,
              status: ["Gebucht", "Vertrag versendet"]
              // only deliver public fields + event type to hide private events
            }, "date name location address type").sort({
              date: 1
            });
          }
          res.status(200).json(bandevents);
        }
      } else {
        res.status(401).json({
          "status": "error",
          "data": {
            "message": "Invalid API key. Please specify valid key."
          }
        });
      }
    }
  }

  //add event api
  async addEvent(req, res) {
    let req_key = req.headers.apikey;
    if (!req_key) {
      res.status(401).json('Unauthorized user');
    } else {
      let user = await UserModel.findOne({
        apikey: req_key
      });
      if (user) {

        let {
          // eventStatus,
          eventName,
          eventLocation,
          eventDate,
          eventStreetAndHouseNumber,
          eventZip,
          eventCity,
          eventCountry,
          message,
          // soundAndLightRadios,
          showtimeStart,
          showtimeEnd,
          pax,
          // eventTypeRadios,
          eventMiscellaneous,
          price,
          // Daten zur Vertragsanschrift
          organizerName,
          organizerPhone,
          organizerEmail,
          organizerWebsite,
          organizerStreetAndHouseNumber,
          organizerZip,
          organizerCity,
          // Daten zur Veranstaltungsdurchführung
          // poster,
          // assistants,
          contactName,
          contactPhone,
          contactEmail,
          // Daten zur Rechnungsstellung
          // differentBillingAddress,
          billingName,
          billingStreetAndHouseNumber,
          billingZip,
          billingCity,
          bandtype
        } = req.body;

        // default value
        let eventStatus = !req.body.status ? "Anfrage" : req.body.status;
        let soundAndLightRadios = !req.body.soundAndLightRadios ? "band" : req.body.soundAndLightRadios;
        let eventTypeRadios = !req.body.eventTypeRadios ? "public" : req.body.eventTypeRadios;
        let differentBillingAddress = !req.body.differentBillingAddress ? false : req.body.differentBillingAddress;
        let poster = !req.body.poster ? "offen" : req.body.poster;
        let assistants = !req.body.assistants ? "offen" : req.body.assistants;

        let data = {
          status: eventStatus,
          name: eventName,
          location: eventLocation,
          address: {
            streetAndHouseNumber: eventStreetAndHouseNumber,
            zipCode: eventZip,
            city: eventCity,
            country: eventCountry
          },
          date: eventDate,
          soundAndLightProvider: soundAndLightRadios,
          showtimeStart: showtimeStart,
          showtimeEnd: showtimeEnd,
          pax: pax,
          type: eventTypeRadios,
          miscellaneous: eventMiscellaneous,
          price: price,
          bandtype: bandtype,
          contractingParty: {
            name: organizerName,
            phone: organizerPhone,
            email: organizerEmail,
            address: {
              streetAndHouseNumber: organizerStreetAndHouseNumber,
              zipCode: organizerZip,
              city: organizerCity,
              country: "Germany"
            }
          },
          poster: poster,
          assistants: assistants,
          eventContact: {
            name: contactName,
            phone: contactPhone,
            email: contactEmail,
            address: null
          },
          differentBillingAddress: differentBillingAddress,
          billingContact: {
            name: billingName,
            phone: null,
            email: null,
            address: {
              streetAndHouseNumber: billingStreetAndHouseNumber,
              zipCode: billingZip,
              city: billingCity,
              country: "Germany"
            }
          }
        };
        const newEvent = new EventModel(data); //add new event

        let newcreated = newEvent.save();

        if (newcreated) {
          res.status(200).json({
            "status": "success",
            "data": {
              "message": "Successfully created event request."
            }
          });
        } else {
          res.status(500).json({
            "status": "fail",
            "data": {
              "message": "Event request could not be created."
            }
          });
        }

        // Infomail an Bandmitglieder
        var smtpTransport = nodemailer.createTransport({
          host: process.env.MAILSERVER,
          secure: true,
          auth: {
            user: process.env.NOREPLY_MAIL,
            pass: process.env.NOREPLY_PASS
          }
        });

        let bandmembers = await MemberModel.find({
          bandtype: bandtype
        });
        if (bandmembers.length > 0) {

          let recipients = [];
          for (let i = 0; i < bandmembers.length; i++) {
            recipients.push(bandmembers[i].email);
          }

          let link = "http://" + req.get('host');

          var mailOptions = {
            from: process.env.NOREPLY_MAIL,
            // replace with band members email
            to: recipients,
            subject: "gigeasy | Neue Anfrage für " + bandtype,
            html: "Hallo, Du hast folgende neue Anfrage erhalten: <ul> <li> Datum: " + eventDate + " </li><li> Name: " + eventName + " </li> <li> Ort: " + eventCity + " </li> <li> Nachricht: " + message + " </li></ul > <br> Details findest Du auf <a href=" + link + ">gigeasy</a>."
          };
          smtpTransport.sendMail(mailOptions, function(error, response) {
            if (error) {
              logger.error.error('Error while sending mail for new event request', error);
            } else {
              logger.info.info('Mail for new event request sent Successfully');
            }
          });
        }
      } else {
        res.status(401).json({
          "status": "error",
          "data": {
            "message": "Invalid API key. Please specify valid key."
          }
        });
      }
    }
  }
}
module.exports = ApiController;
