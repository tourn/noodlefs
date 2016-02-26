"use strict";
var moodle_client = require("moodle-client");
var util = require('util');
var auth = require('./config');

moodle_client.init(auth).then(function(client) {
      do_something(client);

}).catch(function(err) {
      console.log("Unable to initialize the client: " + err);
});

function do_something(client){
	client.call({
			wsfunction: "core_webservice_get_site_info", // get userid from here
			//wsfunction: "core_enrol_get_users_courses", args: { userid: 2510 }, // course list for first dir structure
      // course id wrstat: 108
      // course id WI1: 488
      //wsfunction: "core_course_get_contents", args: { courseid: 108 },
      //wsfunction: "core_course_get_contents", args: { courseid: 488 },
      // wrstat einfuehrung section id : 4656
      // hypothesenbildung und falsifizierung module id: 13460
      // NOPE wsfunction: "core_course_get_course_module", args: { moduleid: 13460 },

	}).then(function(info) {
      console.log(util.inspect(info, false, null));
	});
}

