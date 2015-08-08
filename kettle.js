/*
Kettle.

Copyright 2012-2013 OCAD University

Licensed under the New BSD license. You may not use this file except in
compliance with this License.

You may obtain a copy of the License at
https://github.com/gpii/kettle/LICENSE.txt
*/

var fluid = require("infusion"),
    kettle = fluid.registerNamespace("kettle");

require("./lib/KettleUtils.js");

fluid.module.register("kettle", __dirname, require);

require("./lib/KettleApp.js");
require("./lib/KettleConfigLoader.js");
require("./lib/KettleDataSource.js");
require("./lib/KettleMiddleware.js");
require("./lib/KettleRouter.js");
require("./lib/KettleRequest.js");
require("./lib/KettleRequest.io.js");
require("./lib/KettleServer.js");
require("./lib/KettleServer.io.js");
require("./lib/KettleSession.js");
require("./lib/KettleSession.io.js");

kettle.loadTestingSupport = function () {
    require("./lib/test/KettleTestUtils.js");
};

module.exports = kettle;
