/*
Kettle Data Source Test Utilities

Copyright 2012-2015 Raising the Floor - International

Licensed under the New BSD license. You may not use this file except in
compliance with this License.

You may obtain a copy of the License at
https://github.com/fluid-project/kettle/blob/master/LICENSE.txt
*/

"use strict";

var fluid = require("infusion"),
     kettle = require("../../kettle.js"),
     jqUnit = fluid.require("node-jqunit", require, "jqUnit"),
     fs = require("fs");
 
kettle.loadTestingSupport();

fluid.registerNamespace("kettle.tests.dataSource");

// reinitialise the "writeable" directory area used by tests which issue dataSource writes,
// the start of every test run
kettle.tests.dataSource.ensureWriteableEmpty = function () {
    var writeableDir = fluid.module.resolvePath("%kettle/tests/data/writeable");
    kettle.test.deleteFolderRecursive(writeableDir);
    fs.mkdirSync(writeableDir);
};


// distribute down a standard error handler for any nested dataSource

fluid.defaults("kettle.tests.dataSource.onErrorLink", {
    distributeOptions: {
        onError: {
            record: {
                namespace: "testEnvironment",
                func: "{testEnvironment}.events.onError.fire",
                args: "{arguments}.0"
            },
            target: "{that dataSource}.options.listeners.onError"
        }
    }
});


// General DataSource test grades

fluid.defaults("kettle.tests.dataSourceTestCaseHolder", {
    gradeNames: ["fluid.test.testCaseHolder"],
    mergePolicy: {
        initSequence: "noexpand"
    },
    moduleSource: {
        funcName: "kettle.tests.simpleDSModuleSource",
        args: "{testEnvironment}.options"
    }
});

kettle.tests.dataSource.defaultResponseFunc = function (shouldError, data) {
    fluid.fail(shouldError ? "Got response rather than error from dataSource: " :
        "Error in test configuration - should have overridden response function: ", data);
};

kettle.tests.dataSource.defaultErrorFunc = function (shouldError, data) {
    fluid.fail(shouldError ? "Error in test configuration - should have overridden error function: " :
        "Got error rather than response from dataSource: ", data);
};

// Base grade for each individual DataSource test fixture: Top-level component holding dataSource, test environment and standard events
fluid.defaults("kettle.tests.simpleDataSourceTest", {
    gradeNames: ["fluid.test.testEnvironment", "kettle.tests.dataSource.onErrorLink"],
    shouldError: false,
    events: {
        onResponse: null,
        onError: null
    },
    components: {
        testCaseHolder: {
            type: "kettle.tests.dataSourceTestCaseHolder"
        },
        dataSource: {
            type: "kettle.dataSource" // uninstantiable, must be overridden
        }
    },
    invokers: { // one of these should be overridden, depending on whether "shouldError" is set
        responseFunc: {
            funcName: "kettle.tests.dataSource.defaultResponseFunc",
            args: ["{that}.options.shouldError", "{arguments}.0"]
        },
        errorFunc: {
            funcName: "kettle.tests.dataSource.defaultErrorFunc",
            args: ["{that}.options.shouldError", "{arguments}.0"]
        }
    },
    listeners: {
        onResponse: "{that}.responseFunc",
        onError: "{that}.errorFunc"
    }
});

// Utility for binding returned promise value back to test environment's firers
kettle.tests.dataSource.invokePromiseProducer = function (producerFunc, args, testEnvironment) {
    var promise = producerFunc.apply(null, args);
    promise.then(function (response) {
        testEnvironment.events.onResponse.fire(response);
    });
};

fluid.defaults("kettle.tests.promiseDataSourceTest", {
    gradeNames: ["fluid.component"],
    testPromiseAPI: true,
    invokers: {
        invokePromiseProducer: {
            funcName: "kettle.tests.dataSource.invokePromiseProducer",
            args: ["{arguments}.0", "{arguments}.1", "{testEnvironment}"]
        }
    }
});

// Accepts options for the overall environment and produces a 2-element sequence
// operating the test. 
kettle.tests.simpleDSModuleSource = function (options) {
    var dataSourceMethod = options.dataSourceMethod || "get";
    var dataSourceArgs = [options.directModel];
    if (dataSourceMethod === "set") {
        dataSourceArgs.push(options.dataSourceModel);
    }
    if (options.testPromiseAPI) {
        var onErrorRecord = { // test this special feature of the DataSource API which allows bypass of the standard error handler per-request
            onError: "{testEnvironment}.events.onError.fire"
        };
        dataSourceArgs.push(onErrorRecord);
    } else {
        dataSourceArgs.push("{testEnvironment}.events.onResponse.fire");
    }
    
    var dataSourceFunc = "{testEnvironment}.dataSource." + dataSourceMethod;
    var sequence = fluid.makeArray(options.initSequence);
    if (options.testPromiseAPI) {
        sequence.push({
            func: "{testEnvironment}.invokePromiseProducer",
            args: [dataSourceFunc, dataSourceArgs]
        });
    } else {
        sequence.push({
            func: dataSourceFunc,
            args: dataSourceArgs
        });
    }
    
    sequence.push({
        event: "{testEnvironment}.events." + (options.shouldError ? "onError" : "onResponse"),
        listener: "fluid.identity",
        priority: "last"
    });
    var modules = [{
        name: options.name + (options.testPromiseAPI ? " - via promise API" : ""),
        tests: [{
            expect: 1,
            name: "Simple " + dataSourceMethod + " test",
            sequence: sequence
        }]
    }];
    return modules;
};


kettle.tests.dataSource.testEmptyResponse = function (data) {
    jqUnit.assertEquals("Data response should be undefined", undefined, data);
};

kettle.tests.dataSource.testResponse = function (expected, data) {
    console.log("GOT DATA ", data);
    jqUnit.assertDeepEq("Data response should hold correct value", expected, data);
};

kettle.tests.dataSource.testErrorResponse = function (expected, data) {
    jqUnit.assertDeepEq("Error response should hold correct value", expected, data);
};
