const SerialPort = require("serialport");
const Readline = require("@serialport/parser-readline");

const WebSocket = require("ws");

const math = require("mathjs");

//----------- PUBLISHING RESULTS IN SERVER

const SERIAL_BITRATE = 57600;
const SOCKET_PORT = 5000;
const NUM_CALIBRATION_SAMPLES = 250;

var alpha = 0;
var beta = 0;
var gamma = 0;

var in_calibration = false;
var calSum = [0, 0, 0, 0, 0, 0, 0, 0, 0];
var iCalib = 0;

const wss = new WebSocket.Server({ port: SOCKET_PORT });

wss.on("connection", function connection(ws) {
  console.log("New connection");
  ws.on("message", function incoming(message) {
    console.log("received: %s", message);
    var json = JSON.parse(message);

    if (json["command"] == "connect") {
      serial_connect(json["port"]);
    }

    if (json["command"] == "calibrate") {
      start_calibration();
    }
  });
});

// Broadcast messages
wss.broadcast = function broadcast(data) {
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
};

//----------- START READING SERIAL PORT

var weriumData = "";

var serialport = false;
var parser = "";

function serial_connect(port) {
  if (serialport != false) {
    console.log("Closing serial connection");
    serialport.close(function() {
      console.log("Serial port closed");
    });
  }

  console.log("Opening serial connection");
  // Open Serial port
  serialport = new SerialPort(port, {
    baudRate: SERIAL_BITRATE
  });

  // Set error callback
  serialport.on("error", function(err) {
    console.log("Error: ", err.message);
  });

  // Set data-received callback
  parser = serialport.pipe(new Readline({ delimiter: "\n" }));
  parser.on("data", function(data) {
    data = extract(data);

    if (in_calibration) {
      calibration_loop(data);
    } else {
      calculate_angles(data);
      console.log("Received: ", data);
      var msg = JSON.stringify({
        x: alpha,
        y: beta,
        z: gamma
      });
      wss.broadcast(msg);
    }

    console.log("Serial port open");
  });

  // Write # to tell the device to start sending data
  setTimeout(function() {
    serialport.write("#om", function(err) {
      if (err) {
        console.log("Error on write: ", err.message);
      }
      console.log("Message written");
    });
  }, 1500);
}

//----------- ELABORATE DATA

function extract(msg) {
  // Remove trail character(s)
  var trimmed = msg.trim();
  // Consider only the string after '='
  var arr = trimmed.split("=");
  // split by ',' convert to float and remove timestamp
  return arr[1]
    .split(",")
    .map(x => Number(x))
    .slice(0, -1);
}

var calibMat = math.ones(3, 3);

function calculate_angles(arr) {
  // input: [1, 2, 3, 4, 5, 6, 7, 8, 9]
  // 3x3 reshape [ [ 1, 2, 3 ], [ 4, 5, 6 ], [ 7, 8, 9 ] ]
  var m = math.reshape(arr, [3, 3]);
  // normalize (element by element multiplication)
  m = math.matrix(math.dotMultiply(m, calibMat));

  alpha =
    math.atan2(
      -m.subset(math.index(2, 0)),
      m.subset(math.index(0, 0)) * 180.0
    ) / Math.PI;
  beta = math.asin(m.subset(math.index(1, 0)) * 180.0) / Math.PI;
  gamma =
    math.atan2(
      -m.subset(math.index(1, 2)),
      m.subset(math.index(1, 1)) * 180.0
    ) / Math.PI;

  return [alpha, beta, gamma];
}

function start_calibration() {
  iCalib = 0;
  calSum = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  in_calibration = true;
}

function calibration_loop(data) {
  if (iCalib < NUM_CALIBRATION_SAMPLES) {
    // Sum element by element
    calSum = calSum.map((a, i) => a + data[i]);
    iCalib += 1;
    console.log("Calibration data collected: ", iCalib);
  } else {
    in_calibration = false;
    // calculate calibration matrix
    var calibArr = calSum.map(a => a / NUM_CALIBRATION_SAMPLES);
    calibMat = math.transpose(math.reshape(calibArr, [3, 3]));
    in_calibration = false;
    console.log("Calibration ended");
  }
}

console.log(`Server started, waiting for commands on 127.0.0.1:${SOCKET_PORT}`);
