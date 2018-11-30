////////////////////////////////////////
// Created by Stefano Piazza
// email: to.stefano.piazza@gmail.com
////////////////////////////////////////

(function(ext) {
  var socket = null;
  var connected = false;
  var myStatus = 1; // initially yellow
  var myMsg = "not_ready";
  var rot_x = 0;
  var rot_y = 0;
  var rot_z = 0;

  // Cleanup function when the extension is unloaded
  ext._shutdown = function() {};

  // Status reporting code
  // Use this to report missing hardware, plugin or unsupported browser
  ext._getStatus = function(status, msg) {
    return { status: myStatus, msg: myMsg };
  };

  ext.get_x_rotation = function() {
    return rot_x;
  };

  ext.get_y_rotation = function() {
    return rot_y;
  };

  ext.get_z_rotation = function() {
    return rot_z;
  };

  ext.ask_calibration = function() {
    if (connected == false) {
      alert("Server Not Connected");
    } else {
      var msg = JSON.stringify({
        command: "calibrate"
      });
      window.socket.send(msg);
      console.log("Calibrating");
    }
  };

  ext.connect = function(serialPort) {
    console.log("Connecting to serial port");
    window.socket = new WebSocket("ws://127.0.0.1:5000");
    window.socket.onopen = function() {
      myStatus = 2;
      console.log("Server connected");

      // report connection
      myMsg = "ready";
      connected = true;

      // // timeout for the connection
      var msg = JSON.stringify({
        command: "connect",
        port: serialPort
      });
      window.socket.send(msg);
    };

    window.socket.onmessage = function(message) {
      var msg = JSON.parse(message["data"]);

      rot_x = parseFloat(msg["x"]);
      rot_y = parseFloat(msg["y"]);
      rot_z = parseFloat(msg["z"]);
    };
    window.socket.onclose = function(e) {
      console.log("Connection closed.");
      socket = null;
      connected = false;
      myStatus = 1;
      myMsg = "not_ready";
    };
  };

  // Block and block menu descriptions
  var descriptor = {
    blocks: [
      [
        " ",
        "connect to serial port: %s",
        "connect",
        "/dev/cu.usbserial-A9E55BZ7"
      ],
      [" ", "recalibrate the sensor", "ask_calibration"],
      ["r", "get rotation on X", "get_x_rotation"],
      ["r", "get rotation on Y", "get_y_rotation"],
      ["r", "get rotation on Z", "get_z_rotation"]
    ]
  };

  // Register the extension
  ScratchExtensions.register("Simple Werium extension", descriptor, ext);
})({});
