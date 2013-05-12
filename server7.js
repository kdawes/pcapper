var request = require('request');
var moment = require('moment');
var events = require('events');
var uuid = require('node-uuid');
var follow = require('follow');

var interface = process.argv[2];
var filter = process.argv[3];

console.log([interface, filter].join(" "));

var ee = new events.EventEmitter();

var pcap = require('pcap'),
    tcp_tracker = new pcap.TCP_tracker(),
    pcap_session = pcap.createSession(interface, filter);

tcp_tracker.on('start', function (session) {
	console.log("Start of TCP session between " + session.src_name + " and " + session.dst_name);
    });

tcp_tracker.on('end', function (session) {
	console.log("End of TCP session between " + session.src_name + " and " + session.dst_name);
    });

pcap_session.on('packet', function (raw_packet) {
	var packet = pcap.decode.packet(raw_packet);
	//console.log("PACKET " + JSON.stringify(packet, null, 2));
	ee.emit('burst', { "timestamp":moment.valueOf(), 
		    "packet":packet });
	tcp_tracker.track_packet(packet);
    });
var count = 0;
ee.on('burst', function( data ) { 
	var url = "http://127.0.0.1:5984/ip/";
	var options = { 
	    headers: {'content-type' : 'application/x-www-form-urlencoded'},
	    uri : url,
	    body:data,
	    json:true
	};
	if ( count++ % 10 === 0 ) {
       	request.post(options, function( err, response, body ) {
		if (err) {
		    console.log("ERROR : " + err);
		    return;
		}
		console.log('BURST was POSTED ' + JSON.stringify(body));
		
	    });
	}

    });

follow("http://couch:5984/ip/", function(error, change) {
	if(!error)
	    console.log("Got change number " + change.seq + ": " + change.id + " " + JSON.stringify(change));
    });

setInterval(function() {
    }, 1000);
