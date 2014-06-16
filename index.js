var request = require('request');
var moment = require('moment');
var events = require('events');
var uuid = require('node-uuid');
var follow = require('follow');
var argv = require('optimist').argv;

var ethInterface = argv.eth;
var filter = argv.filter;
var server =  argv.server || "127.0.0.1";
var port =  argv.port || "5984";
var db   =  argv.db || "ip";
var proto =  "http://";
var ratelimit = argv.ratelimit || 100;

var separateReqPool = {maxSockets: 100};

console.log("ARGV " + JSON.stringify(argv, null, 2)); 
console.log([ethInterface, filter].join(" "));

var ee = new events.EventEmitter();
var pcap = require('pcap'),
    tcp_tracker = new pcap.TCP_tracker(),
    pcap_session = pcap.createSession(ethInterface, filter);
var count = 0; 
var queue = [];

tcp_tracker.on('start', function (session) {
	console.log("Start of TCP session between " + session.src_name + " and " + session.dst_name);
});

tcp_tracker.on('end', function (session) {
	console.log("End of TCP session between " + session.src_name + " and " + session.dst_name);
});

pcap_session.on('packet', function (raw_packet) {
	count++;
	var packet = pcap.decode.packet(raw_packet);
	ee.emit('burst', { "timestamp":moment.valueOf(), "packet": packet });
	tcp_tracker.track_packet(packet);
});

ee.on('burst', function( data ) { 
	data._id = uuid.v4();
	queue.push(data);
	if ( ( count > 0 && count % ratelimit === 0)  ) {
		var url = [proto, server,":", port, "/", db,"/","_bulk_docs"].join('');
		var options = { 
			url: url,
			body: { "docs":  queue },
			json: true,
			method: "POST",
			pool: separateReqPool,
			timeout: 4000
		};

		request(options, function( err, response, body) {
			if (err) {
				console.log("ERROR : " + err);
				return;
			} else { 
				//console.log("body" + JSON.stringify(body));
				console.log(response.statusCode + JSON.stringify(body));
				while ( queue.length ) { queue.pop(); }
				console.log("queue freed - length : " + queue.length);
			}
		});
	} 
});

// follow([proto, server,":", port, "/", db].join(''), function(error, change) {
// 	if(!error)
// 	    console.log("Got change number " + change.seq + ": " + change.id);// + " " + JSON.stringify(change));
// });

setInterval(function() {}, 1000);
