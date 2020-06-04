//jshint esversion:8
var UserModel = require('../model/user');
var MemberModel = require('../model/member');
var Event = require('../model/event');
var nodemailer = require('nodemailer');
var ResetTokenModel = require('../model/reset');
var logger = require('../config/log4');

var bcrypt = require('bcrypt-nodejs');


class UserController {

  async home(req, res, next) {
    if (req.isAuthenticated()) {
      const userid = req.user._id;
      const useremail = req.user.email;
      var bandlist = await MemberModel.find({
        'email': useremail
      });
      if (bandlist.length != 0) {
        var bandtype = bandlist[0].bandtype;

        var status = await MemberModel.findOne({
          'email': useremail,
          'status': true
        });
        if (status) {
          bandtype = status.bandtype;
          var events = await Event.find({
            bandtype: bandtype
          });
        } else {
          var events = await Event.find({
            bandtype: bandtype
          });
        }
        res.render('list', {
          userid: userid,
          eventList: events,
          useremail: useremail,
          bandlist: bandlist,
          bandtype: bandtype
        });
      } else {
        res.render('newlist', {
          userid: userid,
          useremail: useremail
        });
      }
    } else {
      res.redirect("/login");
    }
  }

  loginPage(req, res) {
    res.render('login');
  }

  async userPage(req, res) {
    const userid = req.params.userId;
    var currentuser = await UserModel.findOne({
      '_id': userid
    });

    if (currentuser) {
      res.render('userchange', {
        currentuser: currentuser,
        userid: userid
      });
    } else {
      logger.error.error("Fehler beim Laden des Benutzerkontos. Bitte kontaktieren Sie das Support-Team.");
    }
  }

  async userChange(req, res) {
    var changename = req.body.currentuser;
    var changeemail = req.body.currentemail.toLowerCase();
    var changepass = req.body.currentpass;
    const generateHash = (password) => {
      var bcrypt = require('bcrypt-nodejs');
      return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
    }
    UserModel.findOneAndUpdate({
      '_id': req.user.id
    }, {
      $set: {
        'username': changename,
        'email': changeemail,
        'password': generateHash(changepass)
      }
    }, function(err) {
      if (!err) {
        res.redirect('/');
      } else {
        logger.error.error('Fehler beim Speichern der Änderungen am Benutzerkonto. Bitte kontaktieren Sie das Support-Team.', error);
      }
    });
  }

  forgotPage(req, res) {
    res.render('forgot');
  }
  async forgotPassword(req, res) {
    var email = req.body.useremail.toLowerCase();
    var user = await UserModel.find({
      'email': email
    }).exec();
    if (user.length == 1) {
      var smtpTransport = nodemailer.createTransport({
        host: process.env.MAILSERVER,
        secure: true,
        auth: {
          user: process.env.NOREPLY_MAIL,
          pass: process.env.NOREPLY_PASS
        }
      });
      var mailOptions, host, link;

      const sendResetEmail = (token, id) => {
        host = req.get('host');
        link = "http://" + req.get('host') + "/reset?token=" + token + '&id=' + id;
        mailOptions = {
          from: process.env.NOREPLY_MAIL,
          to: email,
          subject: "gigeasy: Passwort zurücksetzen ",
          html: "Hallo,<br> Du erhältst diese Email, weil Du (oder jemand anderes) das Passwort für Deinen gigeasy Benutzeraccount zurücksetzen möchte." +
            "< br > Bitte klicke auf den folgenden Link, um Dein Passwort zurückzusetzen: < br > " +
            "<a href=" + link + ">Passwort zurücksetzen</a>"
        }
        smtpTransport.sendMail(mailOptions, function(error, response) {
          if (error) {
            req.flash('forgotMessage', 'Error while sending message. Please contact support team.')
            res.redirect("/forgot");
          } else {
            req.flash('successMessage', 'Message is sent successfully.')
            res.redirect("/forgot");
          }
        });
      };
      var id = user[0]._id;
      var newToken = new ResetTokenModel();
      newToken.id = id;
      newToken.token = newToken.generateToken();
      newToken.save(function(err) {
        if (err)
          res.render({
            ret: false
          });
        sendResetEmail(newToken.token, newToken.id);
      });
    } else {
      req.flash('forgotMessage', 'Es wurde kein Benutzerkonto für ' + email + ' gefunden.');
      res.redirect("/forgot");
    }
  }

  async resetPage(req, res) {
    var token = req.query.token;
    var id = req.query.id;
    var resetTokenModel = await ResetTokenModel.find({
      token: token,
      id: id
    }).exec();
    if (resetTokenModel[0] == undefined) {
      req.flash('resetMessage', 'Das Sicherheitstoken zum Zurücksetzen des Passworts ist abgelaufen oder ungültig. Bitte versuchen Sie es noch einmal.')
      res.redirect("/reset");
    } else {
      res.render('reset', {
        id: id,
        token: token
      });
    }
  }

  async resetPassword(req, res) {
    var token = req.body.token;
    var id = req.body.id;
    var pwd = req.body.password;
    var conf = req.body.confirm;
    var resetTokenModel = await ResetTokenModel.find({
      token: token,
      id: id
    }).exec();
    const generateHash = (password) => {
      var bcrypt = require('bcrypt-nodejs');
      return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
    }
    if (pwd != conf) {
      req.flash('resetMessage', 'Passwort und Passwortwiederholung stimmen nicht überein. Bitte versuchen Sie es noch einmal.')
      res.redirect("back");
    } else {
      if (resetTokenModel[0] == undefined) {
        req.flash('resetMessage', 'Das Sicherheitstoken zum Zurücksetzen des Passworts ist abgelaufen oder ungültig. Bitte versuchen Sie es noch einmal.')
        res.redirect("/reset");
      } else {
        ResetTokenModel.find({
          token: token,
          id: id
        }).deleteOne().exec();
        UserModel.updateOne({
          '_id': id
        }, {
          $set: {
            'password': generateHash(pwd)
          }
        }, function(err, data) {
          if (err) {
            logger.error.error('Password updating is failed', err);
            req.flash('resetMessage', 'Das Passwort konnte nicht geändert werden. Bitte kontaktieren Sie das Support-Team.')
            res.redirect("/reset");
          } else
            res.redirect('/login');
        });
      }
    }

  }

  registerPage(req, res) {
    res.render("register");
  }
  registerPageBand(req, res) {
    var bandId = req.query.bandId;
    var inviteemail = req.query.inviteemail;
    res.render("registerwithband", {
      bandId: bandId,
      inviteemail: inviteemail
    });
  }

  async logoutUser(req, res) {
    await MemberModel.updateMany({
      $set: {
        status: false
      }
    });
    req.logout();
    res.redirect("/");
  }
}
module.exports = UserController;
