var request = require('request');
var moment = require('moment');
var events = require('events');
var uuid = require('node-uuid');

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
	
	ee.emit('burst', { "timestamp":moment.valueOf(), 
		    "packet":raw_packet });
	tcp_tracker.track_packet(packet);
    });

ee.on('burst', function( data ) { 
	var url = "http://127.0.0.1:5984/ip/";
	var options = { 
	    uri : url,
	    body:data,
	    json:true
	};
	request.post(options, function( err, response, body ) {
		if (err) {
		    console.log("ERROR : " + err);
		    return;
		}
		//console.log('response ' + JSON.stringify(response));
		
	    });

    });

setInterval(function() { console.log("ping"); }, 2000 );



