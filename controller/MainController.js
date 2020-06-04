//jshint esversion:8
var EventModel = require('../model/event');
var EventVersionModel = require('../model/eventversion');
var BandModel = require('../model/band');
var UserModel = require('../model/user');
var MemberModel = require('../model/member');
var FileModel = require('../model/eventfile');
var logger = require('../config/log4');
var fs = require('fs');
var aws = require('aws-sdk');
var nodemailer = require('nodemailer');
const mongoose = require("mongoose");
const _ = require("lodash");

var dateFormatter = require('../util/date-formatter');
mongoose.set('useFindAndModify', false);

class MainController {
  async editEvent(req, res) {
    if (req.isAuthenticated()) {
      const eventId = req.params.eventId;

      const userId = req.user.id;


      let foundEvent = await EventModel.findOne({
        _id: eventId
      });
      let bandtype = foundEvent.bandtype;
      //get the uploaded data
      let file = await FileModel.findOne({
        eventId: eventId
      });
      let file_content = file ? file : null;
      //get the last invoice number of band
      let band = await BandModel.findOne({
        name: bandtype
      });
      let lastInvoiceNumber = band.lastInvoiceNumber;
      if (foundEvent) {
        res.render("details", {
          file_content: file_content,
          event: foundEvent,
          userid: userId,
          lastInvoiceNumber: lastInvoiceNumber
        });
      } else {
        logger.error.error("Event is not exist");
        res.send("Fehler: Event nicht gefunden. <a href='/'> Zurück zur Übersicht</a>");
      }
    } else {
      res.redirect("/login");
    }
  }

  async addEvent(req, res) {
    if (req.isAuthenticated()) {
      const bandtype = req.body.bandtype;

      const userId = req.user.id;

      let event = new EventModel();
      event.status = "Anfrage";
      event.soundAndLightProvider = "band";
      event.type = "public";
      event.differentBillingAddress = false;
      event.poster = "offen";
      event.assistants = "offen";
      event.bandtype = bandtype;
      event.version = 1;
      event.created = new Date();
      event.modified = new Date();
      event.modifierID = userId;

      //get the last invoice number of band
      let band = await BandModel.findOne({
        name: bandtype
      });
      let lastInvoiceNumber = band.lastInvoiceNumber;

      res.render("details", {
        file_content: null,
        event: event,
        userid: userId,
        lastInvoiceNumber: lastInvoiceNumber
      });
    } else {
      res.redirect("/login");
    }
  }

  async copyEvent(req, res) {
    if (req.isAuthenticated()) {
      const eventId = req.params.eventId;
      const bandtype = req.query.bandforevent;
      const userId = req.user.id;

      let foundEvent = await EventModel.findOne({
        _id: eventId
      });
      if (foundEvent) {

        let event = new EventModel();
        let newEventId = event._id;
        event = _.cloneDeep(foundEvent);
        event._id = newEventId;
        event.name = "Kopie von " + foundEvent.name;
        event.version = 1;
        event.created = new Date();
        event.modified = new Date();
        event.modifierID = userId;

        res.render("details", {
          event: event,
          userid: userId
        });
      } else {
        logger.error.error("Event with id " + eventId + " not found");
        res.send("Fehler: Event nicht gefunden. <a href='/'> Zurück zur Übersicht</a>");
      }
    } else {
      res.redirect("/login");
    }
  }

  async saveEvent(req, res) {

    // Allgemeine Daten zum Event
    let userid = req.user.id;
    let version = !req.body.version ? 1 : req.body.version;
    version++;

    const {
      eventId,
      eventStatus,
      eventName,
      eventLocation,
      eventStreetAndHouseNumber,
      eventZip,
      eventCity,
      eventDate,
      soundAndLightRadios,
      showtimeStart,
      showtimeEnd,
      pax,
      eventTypeRadios,
      eventMiscellaneous,
      price,
      // Daten zur Vertragsanschrift
      organizerName,
      organizerPhone,
      organizerEmail,
      organizerStreetAndHouseNumber,
      organizerZip,
      organizerCity,
      // Daten zur Veranstaltungsdurchführung
      poster,
      assistants,
      contactName,
      contactPhone,
      contactEmail,
      // Daten zur Rechnungsstellung
      differentBillingAddress,
      billingName,
      billingStreetAndHouseNumber,
      billingZip,
      billingCity,
      bandtype,
    } = req.body;

    let event = {
      status: eventStatus,
      name: eventName,
      location: eventLocation,
      address: {
        streetAndHouseNumber: eventStreetAndHouseNumber,
        zipCode: eventZip,
        city: eventCity,
        country: "Germany"
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
      version: version,
      modified: new Date(),
      modifierID: userid,
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

    //Detect the event change
    let bandid = await BandModel.findOne({
      name: bandtype
    });
    var currentTimestamp = new Date();

    var ischanged = req.body.ischanged;


    // if the band event is changed
    if (ischanged == 'true') {
      // console.log(EventVersionModel.schema)

      /////////////////////////////////////////////////////
      // Save old event version to eventversions collection
      let foundEvent = await EventModel.findById(eventId, {
        _id: 0
      });
      if (foundEvent) {
        let data = {
          event: foundEvent
        };
        const eventRevision = new EventVersionModel(data);

        // save old version in eventRevisions
        try {
          await eventRevision.save();
          logger.system.info('Successfully saved old version of event in histoy');

        } catch (err) {
          logger.error.error('Error saving event revision to history. Details: ', err);
        }
      }

      ////////////////////////////////
      // Save event
      EventModel.findOneAndUpdate({
        _id: eventId
      }, {
        $set: event // update event
      }, async (err, foundEvent) => {
        if (!err) {
          if (!foundEvent) {
            event.created = new Date();
            const newEvent = new EventModel(event); //add new event
            newEvent.save();
          }
          // send email to the band members

          // let bandmember = await MemberModel.find({
          //   bandtype: bandtype
          // });
          // let recipients = [];
          // for(let i=0; i<bandmember.length; i++) {
          //   recipients.push(bandmember[i].email);
          // }
          // var smtpTransport = nodemailer.createTransport({
          //   host: process.env.MAILSERVER,
          //   secure: true,
          //   auth: {
          //     user: process.env.NOREPLY_MAIL,
          //     pass: process.env.NOREPLY_PASS
          //   }
          // });
          // var mailOptions = {
          //   from: process.env.NOREPLY_MAIL,
          //   to: recipients,
          //   subject: `${bandtype} is changed`,
          //   html: "The band event is changed"
          // };
          // smtpTransport.sendMail(mailOptions, function (error, response) {
          //   console.log('email is sending now');
          //   if (error) {
          //     logger.error.error('Error while sending mail for new event request', error);
          //     req.flash('success', 'Ihre Änderungen wurden erfolgreich übernommen.');
          //     res.json({ status: true, sendmail: 'failed' });
          //   } else {
          //     logger.info.info('Emails are sent successfully');
          //     req.flash('success', 'Ihre Änderungen wurden erfolgreich übernommen.');
          //     res.json({ status: true, sendmail: 'success' });
          //   }
          // });

          req.flash('success', 'Ihre Änderungen wurden erfolgreich übernommen.');
          res.json({
            status: true
          });
        } else {
          logger.error.error('Event could not be saved. Details: ', err);
          req.flash('error', 'Deine Änderungen konnten nicht gespeichert werden. Bitte kontaktiere das Support-Team. Fehlerursache: ' + err);
          res.redirect('details/' + eventId);
        }
      });
    } else {
      res.json({
        status: true
      });
    }
  }

  //after click the cancel button in detail page
  cancelEvent(req, res) {
    res.redirect("/");
  }

  // save files to DB.
  async uploadFiles(req, res) {

    let eventId = req.body.eventId;
    let isfiles = req.files;
    let existing = await FileModel.findOne({
      eventId
    });

    if (!isfiles) {
      const error = new Error('Please choose files');
      res.send(error);
    } else {
      let content = await getContent(isfiles);
      if (existing) {
        if (existing.content.length != 0) {
          // if has the same name then replace.. and push other case
          for (let i = 0; i < existing.content.length; i++) {
            var added_content = [];
            for (let j = 0; j < content.length; j++) {

              if (existing.content[i].name === content[j].name) {
                existing.content[i] = content[j];
              } else {
                if (!added_content.includes(content[j]))
                  added_content.push(content[j]);
              }
            }
          }
          existing.content = [...existing.content, ...added_content];
          existing.save((err) => {
            if (err) res.send(err);
            res.redirect('back');
          });
        } else {
          existing.content = content;
          existing.save((err) => {
            if (err) res.send(err);
            res.redirect('back');
          });
        }
      } else {
        const fileContent = new FileModel({
          content: content,
          eventId: eventId
        });
        fileContent.save((err) => {
          if (err) res.send(err);
          res.redirect('back');
        });
      }
    }
  }

  async getFiles(req, res) {
    let key = req.params.key;
    //bucket info
    let bucketInstance = new aws.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    });
    let params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key
    };
    bucketInstance.getObject(params, function(err, data) {
      res.send(data.Body);
    });
  }

  async cancelFiles(req, res) {
    res.redirect('back');
  }

  async deleteFile(req, res) {
    let name = req.body.name;
    let id = req.body.id;
    let dbname = req.body.dbname;
    let file = await FileModel.findOne({
      eventId: id
    });

    //bucket info
    let bucketInstance = new aws.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    });
    let params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: name
    };
    //remove the data from DB
    for (let i = 0; i < file.content.length; i++) {
      if (file.content[i].name == dbname) {
        file.content.splice(i, 1);
      }
    }
    //save the changed data
    file.save(err => {
      if (err) res.send(err);
      bucketInstance.deleteObject(params, function(err, data) {
        if (data) {
          res.send({
            status: 'success'
          });
        } else {
          res.send({
            error: err,
            // status: "success"
          });
        }
      });
    });
  }

  //invoice change
  invoiceChange(req, res) {
    let bandname = req.body.beforeband_invoice;
    let newinvoice = req.body.invoiceChange;
    BandModel.findOneAndUpdate({
      name: bandname
    },
    {
      invoice: JSON.parse(newinvoice),
    }, async (err, foundEvent) => {
      if(!err) {
        res.redirect('/bandsetpage');
      }
      else {
        res.send(err);
        logger.error.error("Can't change the invoice content: ", error);
      }
    });
  }
  //contract change
  contractChange(req, res) {
    let bandname = req.body.beforeband_contract;
    let newcontract = req.body.contractChange;
    BandModel.findOneAndUpdate({
      name: bandname
    },
    {
      contract: JSON.parse(newcontract),
    }, async (err, foundEvent) => {
      if(!err) {
        res.redirect('/bandsetpage');
      }
      else {
        res.send(err);
        logger.error.error("Can't change the contract content: ", error);
      }
    });
  }

  //delete member
  async deleteMember(req, res) {
    let memberId = req.body.id;
    let foundMember = await MemberModel.findOne({
      _id: memberId
    });
    if (foundMember)
      await MemberModel.deleteOne({
        _id: memberId
      });
    res.json({
      status: true
    });
  }

  deleteEvent(req, res) {
    EventModel.findByIdAndDelete({
      _id: req.body.id
    }, function(err) {
      if (err) {
        res.json({
          status: false
        });
        logger.error.error('Event could not be found. Details:', err);
      } else {
        res.json({
          status: true
        });
      }
    });
  }

  // band setting page
  async bandPage(req, res) {
    const userid = req.user.id;
    const currentemail = req.user.email;
    try {
      var bandlist = await MemberModel.find({
        'email': currentemail
      });
      var status = await MemberModel.findOne({
        'email': currentemail,
        'status': true
      });
      if (status) {
        var firstshow = await MemberModel.find({
          bandtype: status.bandtype
        });
        var bandinfo = await BandModel.findOne({
          name: status.bandtype
        });
      } else {
        var firstshow = await MemberModel.find({
          bandtype: bandlist[0].bandtype
        });
        var bandinfo = await BandModel.findOne({
          name: bandlist[0].bandtype
        });
      }
      res.render('changeband', {
        userid: userid,
        bandlist: bandlist,
        firstshow: firstshow,
        bandinfo_invoice: JSON.stringify(bandinfo.invoice, undefined, 4),
        bandinfo_contract: JSON.stringify(bandinfo.contract, undefined, 4),
      });
    } catch (error) {
      logger.error.error("Band could not be found. Details: ", error);
    }
  }

  //band change
  async bandChange(req, res) {
    var beforeband = req.body.beforeband;
    var changeband = req.body.changeband;
    try {
      await MemberModel.updateMany({
        'bandtype': beforeband
      }, {
        $set: {
          bandtype: changeband
        }
      });
      await EventModel.updateMany({
        'bandtype': beforeband
      }, {
        $set: {
          bandtype: changeband
        }
      });
      await BandModel.updateMany({
        'name': beforeband
      }, {
        $set: {
          name: changeband
        }
      });
      res.redirect('/bandsetpage');
    } catch (error) {
      logger.error.error("Band settings could not be saved. Details: ", error);
    }
  }
  // add band page
  async addbandPage(req, res) {
    const userid = req.user.id;
    const currentemail = req.user.email; //loged user email
    try {
      var hasband = await MemberModel.findOne({
        'email': currentemail
      });
      res.render('newband', {
        userid: userid,
        hasband: hasband
      });
    } catch (error) {
      logger.error.error("Band could not be found. Details: ", error);
    }
  }
  // add band click
  async addBand(req, res) {
    var bandname = req.body.newband;
    var isband = await BandModel.findOne({
      'name': bandname
    });
    var islogeduser = await UserModel.findOne({
      '_id': req.user.id
    });
    if (isband) {
      req.flash('addband', 'Eine Band mit diesem Namen existiert bereits in gigeasy. Bitte wähle einen anderen Namen oder kontaktiere das Support-Team.');
      res.redirect("/newband");
    } else {
      let band = new BandModel();
      let member = new MemberModel();
      //band name added
      band.name = bandname;
      //current user is added this band automatically
      member.email = req.user.email;
      member.name = islogeduser.username;
      member.bandtype = bandname;
      band.save();
      member.save();
      res.redirect('/');
    }
  }

  async inviteMember(req, res) {
    var email = req.body.invite;
    var bandtype = req.body.modalband;
    var smtpTransport = nodemailer.createTransport({
      host: process.env.MAILSERVER,
      secure: true,
      auth: {
        user: process.env.NOREPLY_MAIL,
        pass: process.env.NOREPLY_PASS
      }
    });
    var bandinfo = await BandModel.findOne({
      'name': bandtype
    });
    var alreadymember = await MemberModel.findOne({
      'email': email,
      bandtype: bandtype
    });
    var islogeduser = await UserModel.findOne({
      'email': email
    });
    if (alreadymember) {
      req.flash('inviteErr', 'Dieser Benutzer ist bereits Mitglied der Band und wird deshalb nicht erneut hinzugefügt.');
      res.redirect("/bandsetpage");
    } else {
      if (!islogeduser) {
        var link = `http://${req.get('host')}/registerwithband?bandId=${bandinfo._id}&inviteemail=${email}`;
        var mailOption = {
          from: process.env.NOREPLY_MAIL,
          to: email,
          subject: "gigeasy | Jemand hat Dich zur Band " + bandtype + " auf gigeasy eingeladen.",
          html: "Hallo,<br> Du wurdest als Mitglied der Band " + bandtype + " auf gigeasy hinzugefügt. <br>Bitte klicke auf den folgenden Link, um die Registrierung abzuschließen:<br>" +
            "<a href=" + link + ">Registrierung abschließen</a>"
        };
        smtpTransport.sendMail(mailOption, function(error, response) {
          if (error) {
            logger.error.error('Error while sending email. Details: ', error);
            req.flash('inviteErr', 'Fehler beim Senden der Einladungs-Email. Bitte versuche es erneut oder kontaktiere unser Support-Team.');
            res.redirect("/bandsetpage");
          } else {
            req.flash('inviteSucc', 'Die Einladungs-Email wurde erfolgreich an ' + email + ' versendet.');
            res.redirect("/bandsetpage");
          }
        });
      } else {
        var member = new MemberModel();
        member.bandtype = bandtype;
        member.email = email;
        member.name = islogeduser.username;
        member.save(function(err) {
          if (!err) {
            req.flash('inviteSucc', email + ' wurde erfolgreich hinzugefügt.');
            res.redirect('/bandsetpage');
          } else {
            req.flash('inviteErr', 'Fehler beim Hinzufügen von ' + email + '. Bitte versuche es erneut oder kontaktiere unser Support-Team.');
            logger.error.error('Error while adding user to band', err);
          }
        });
      }
    }
  }

  //band selecting in list page
  async bandSelect(req, res) {
    var useremail = req.user.email;
    var bandtype = req.body.bandtype;
    await MemberModel.updateMany({
      $set: {
        status: false
      }
    });
    var memberstatus = await MemberModel.findOne({
      'bandtype': bandtype,
      'email': useremail
    });
    memberstatus.status = true;
    memberstatus.save();
    var eventList = await EventModel.find({
      'bandtype': bandtype
    });
    var senddata = [];
    var tbody = '';
    // eventList.forEach(function (event) {
    //   tbody += "<tr><td>" + dateFormatter.dateToGermanDateString(event.date) + "</td><td>" + event.name + "</td> <td>" + event.address.zipCode + " " + event.address.city + "</td><td>" + event.status +
    //     "</td><td class='text-center'><a href = 'details/" + event._id +
    //     "'><i class='fas fa-edit'></i></a></td><td class='text-center'><a href='copy/" + event._id + "'><i class='fas fa-copy'></i></a></td><td class='text-center'><a class='a-button' onclick='deleteEvent(\"" +
    //     event._id + "\")'><i class='fas fa-trash-alt'></i></a></td><tr>";
    // });
    eventList.forEach(function(event) {
      senddata.push([
        dateFormatter.dateToGermanDateString(event.date),
        event.name,
        event.address.zipCode + " " + event.address.city,
        event.status,
        "<a href = 'details/" + event._id + "'><i class='fas fa-edit'></i></a>",
        "<a href='copy/" + event._id + "'><i class='fas fa-copy'></i></a>",
        "<a class='a-button' onclick='deleteEvent(\"" + event._id + "\")'><i class='fas fa-trash-alt'></i></a>",
      ]);
    });
    res.json({
      senddata: senddata
    });
  }

  // band member table in bandsetting page
  async bandmemberSelect(req, res) {
    var bandtype = req.body.bandtype;
    var useremail = req.user.email;
    var bandinfo = await BandModel.findOne({
      name: bandtype
    });

    var membersenddata = [];
    await MemberModel.updateMany({
      $set: {
        status: false
      }
    });
    var memberstatus = await MemberModel.findOne({
      'bandtype': bandtype,
      'email': useremail
    });
    memberstatus.status = true;
    memberstatus.save();
    var membershow = await MemberModel.find({
      bandtype: bandtype
    });

    membershow.forEach(function(member) {
      membersenddata.push([
        member.name,
        member.email,
        "<a class='a-button' onclick='deleteMember(\"" + member._id + "\")'><i class='fas fa-trash-alt'></i> Löschen</a>"
      ]);
    });
    res.json({
      senddata: membersenddata,
      bandinfo: bandinfo
    });
  }

  // change history page

  async changeHistory(req, res) {
    const userid = req.user.id;
    const useremail = req.user.email;
    let changedHistory = [];

    const bands = await MemberModel.find({
      email: useremail
    });

    for (let i = 0; i < bands.length; i++) {

      const eventversions = await EventVersionModel.find({
        'event.bandtype': bands[i].bandtype
      });

      for (let j = 0; j < eventversions.length; j++) {

        changedHistory.push(eventversions[j].event);
      }
    }

    res.render("changehistory", {
      userid: userid,
      changedHistory: changedHistory
    });
  }

  createIcs(req, res) {
    const ics = require('ics');
    const eventName = req.body.eventName;
    const eventLocation = req.body.eventLocation;
    const eventDate = req.body.eventDate;
    const soundAndLightProvider = req.body.soundAndLightRadios;
    const showtimeStart = req.body.showtimeStart;
    const showtimeEnd = req.body.showtimeEnd;
    const miscellaneous = req.body.eventMiscellaneous;

    let split_date = eventDate.split("-");
    let split_time_start = !showtimeStart ? [0, 0] : showtimeStart.split(":");
    let split_time_end = !showtimeEnd ? [0, 0] : showtimeEnd.split(":");
    let band_start = new Date(Date.UTC(split_date[0], split_date[1] - 1, split_date[2], split_time_start[0], split_time_start[1]));
    if (split_time_start[0] > 12 && split_time_end[0] < 12) {
      var add_min = 60 * parseInt(split_time_end[0]) + parseInt(split_time_end[1]) - 60 * parseInt(split_time_start[0]) - parseInt(split_time_start[1]) + 60 * 24;
    } else {
      var add_min = 60 * parseInt(split_time_end[0]) + parseInt(split_time_end[1]) - 60 * parseInt(split_time_start[0]) - parseInt(split_time_start[1]);
    }

    var month = band_start.getUTCMonth() + 1; //months from 1-12
    var day = band_start.getUTCDate();
    var year = band_start.getUTCFullYear();
    var minutes = band_start.getUTCMinutes();
    var hour = band_start.getUTCHours();

    let calendarEntry;

    // if neither start nor end is defined, create a full day event
    if (!showtimeStart && !showtimeEnd) {
      calendarEntry = {
        title: eventName,
        description: "Location: " + eventLocation + "\n" + "Technik: " + soundAndLightProvider + "\n" + "Sonstiges: " + miscellaneous,
        busyStatus: 'BUSY',
        start: [year, month, day],
        end: [year, month, day],
      };
    } else {
      calendarEntry = {
        title: eventName,
        description: "Location: " + eventLocation + "\n" + "Technik: " + soundAndLightProvider + "\n" + "Sonstiges: " + miscellaneous,
        busyStatus: 'BUSY',
        start: [year, month, day, hour, minutes],
        duration: {
          minutes: add_min
        }
      };
    }

    let data = ics.createEvent(calendarEntry,
      (error, value) => {
        if (error) {
          logger.error.error('Error when creating ICS file. Details: ', error);
        }
        return value;
      });
    // res.contentType('text/calendar');
    res.attachment(eventName + ".ics");
    res.send(data);
  }
}

function getContent(isfiles) {
  let content = [];
  return new Promise((resovle, reject) => {
    for (let i = 0; i < isfiles.length; i++) {
      let fileData = {
        name: isfiles[i].originalname,
        contentType: isfiles[i].mimetype,
        path: isfiles[i].location,
      };
      content.push(fileData);
    }
    resovle(content);
  })

}

module.exports = MainController;
