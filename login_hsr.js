"use strict";

/*
 * This module mimicks the moodle mobile app logging into the HSR moodle, like a browser
 */

var Promise = require('bluebird');
var request = require('request');
var jar = request.jar();

function authenticate(username, password){
  return new Promise(function(resolve, reject){
    request({
      url : 'https://moodle.hsr.ch/local/mobile/launch.php?service=local_mobile&passport=1234',
      jar: jar
    }, function(error, response){
      //console.log("1 ##################################################");
      if(error) { console.log(error); }
      else {
        //landed on WAYF page
        //console.log(response.body);
        //console.log(jar);
        //
        request.post({
          url: 'https://wayf.switch.ch/SWITCHaai/WAYF?entityID=https%3A%2F%2Fmoodle.hsr.ch%2Fshibboleth&return=https%3A%2F%2Fmoodle.hsr.ch%2FShibboleth.sso%2FDS%3FSAMLDS%3D1%26target%3Dhttps%253A%252F%252Fmoodle.hsr.ch%252Fauth%252Fshibboleth%252Findex.php',
          jar: jar,
          followAllRedirects: true,
          formData: {
            request_type: "embedded",
            user_idp: "https://aai-login.hsr.ch/idp/shibboleth",
            Login: "Login"
          }
        }, function(error, response){
          //console.log("2 ##################################################");
          if(error) { console.log(error); }
          else {
            //on password entry page
            //console.log(response.body);
            request.post({
              url: 'https://aai-login.hsr.ch/idp/Authn/UserPassword',
              jar: jar,
              followAllRedirects: true,
              form: {
                j_username: username,
                j_password: password,
                'submit.x': '23',
                'submit.y': '5'
              }
            }, function(error, response){
              //console.log("3 ##################################################");
              if(error) { console.log(error); }
              else {
                //on saml continue page
                //console.log(response.body);
                var data = {};
                var rs = /name="RelayState" value="([^"]*)"/.exec(response.body);
                if(rs === null){
                  reject("Login failed!");
                  return;
                }
                data.RelayState = rs[1].replace('&#x3a;', ':');
                data.SAMLResponse = /name="SAMLResponse" value="([^"]*)"/.exec(response.body)[1];

                request.post({
                  url: 'https://moodle.hsr.ch/Shibboleth.sso/SAML2/POST',
                  jar: jar,
                  form: data,
                }, function(error, response){
                  //console.log("4 ##################################################");
                  if(error) { console.log(error); }
                  else {
                    //console.log(response.headers.location);
                    request.get({
                      url: response.headers.location,
                      followRedirect: false,
                      jar: jar
                    }, function(error, response){
                      //console.log("5 ##################################################");
                      if(error) { console.log(error); }
                      else {
                        //console.log(response.headers.location);
                        request.get({
                          url: response.headers.location,
                          followRedirect: false,
                          jar: jar
                        }, function(error, response){
                          //console.log("6 ##################################################");
                          if(error) { console.log(error); }
                          else {
                            //console.log(response.headers.location);
                            var token64 = response.headers.location.replace('moodlemobile://token=', '');
                            var token = new Buffer(token64, 'base64').toString('ascii');
                            //console.log();
                            resolve(token.split(':::')[1]);
                          }
                        });
                      }
                    });
                  }
                });
              }
            });
          }
        });
      }
    });
  });
}


function authenticateInteractively(){
  return new Promise(function(resolve, reject){
    var read = require("read");
    read({ prompt: 'HSR Benutzername: ' }, function(error, username){
      if(error){
        reject('User cancelled login');
      } else {
        read({ prompt: 'Passwort: ', silent: true }, function(error, password){
          if(error){
            reject('User cancelled login');
          } else {
            authenticate(username, password).then(function(token){
              resolve(token);
            }).catch(function(error){
              reject(error);
            });
          }
        });
      }
    });
  });
}

module.exports = {
  authenticate: authenticate,
  authenticateInteractively: authenticateInteractively
};
