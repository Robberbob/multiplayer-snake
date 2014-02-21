#!/bin/env node
require('strong-agent').profile();
var express = require('express');
var fs      = require('fs');

var http = require('http');
/**
 *  Define the sample application.
 */
var frontEnd = function() {

    //  Scope.
    var self = this;


    /*  ================================================================  */
    /*  Helper functions.                                                 */
    /*  ================================================================  */

    /**
     *  Set up server IP address and port # using env variables/defaults.
     */
    self.setupVariables = function() {
        //  Set the environment variables we need.
        self.ipaddress = process.env.OPENSHIFT_NODEJS_IP;
        self.port      = process.env.OPENSHIFT_NODEJS_PORT || 8000;

        if (typeof self.ipaddress === "undefined") {
            //  Log errors on OpenShift but continue w/ 127.0.0.1 - this
            //  allows us to run/test the app locally.
            local = "127.0.0.1";
            console.warn('No OPENSHIFT_INTERNAL_IP var, using '+local);
            self.ipaddress = local;
        };
    };


    /**
     *  Populate the cache.
     */
    self.populateCache = function() {
        if (typeof self.zcache === "undefined") {
            self.zcache = { 'index.html': '' };
        }

        //  Local cache for static content.
        self.zcache['index.html'] = fs.readFileSync('./client/index.html');
        self.zcache['style.css'] = fs.readFileSync('./client/style.css');
        self.zcache['js/global.js'] = fs.readFileSync('./client/js/global.js');
        self.zcache['js/ntc.js'] = fs.readFileSync('./client/js/ntc.js');
        self.zcache['mecha-webfont.woff'] = fs.readFileSync('./client/mecha-webfont.woff');
        self.zcache['mecha-webfont.ttf'] = fs.readFileSync('./client/mecha-webfont.ttf');
        self.zcache['mecha-webfont.svg'] = fs.readFileSync('./client/mecha-webfont.svg');
        self.zcache['js/jquery.min.js'] = fs.readFileSync('./client/js/jquery.min.js');
        self.zcache['js/keyDecode.js'] = fs.readFileSync('./client/js/keyDecode.js');
        self.zcache['js/game.js'] = fs.readFileSync('./client/js/game.js');
        self.zcache['js/body.js'] = fs.readFileSync('./client/js/body.js');
        self.zcache['js/kitchen.js'] = fs.readFileSync('./client/js/kitchen.js');
        self.zcache['js/snake.js'] = fs.readFileSync('./client/js/snake.js');
        self.zcache['js/level.js'] = fs.readFileSync('./client/js/level.js');
        //self.zcache['index2.html'] = fs.readFileSync('./index2.html');
    };


    /**
     *  Retrieve entry (content) from cache.
     *  @param {string} key  Key identifying content to retrieve from cache.
     */
    self.cache_get = function(key) { return self.zcache[key]; };


    /**
     *  terminator === the termination handler
     *  Terminate server on receipt of the specified signal.
     *  @param {string} sig  Signal to terminate on.
     */
    self.terminator = function(sig){
        if (typeof sig === "string") {
           console.log('%s: Received %s - terminating sample app ...',
                       Date(Date.now()), sig);
           process.exit(1);
        }
        console.log('%s: Node server stopped.', Date(Date.now()) );
    };


    /**
     *  Setup termination handlers (for exit and a list of signals).
     */
    self.setupTerminationHandlers = function(){
        //  Process on exit and signals.
        process.on('exit', function() { self.terminator(); });

        // Removed 'SIGPIPE' from the list - bugz 852598.
        ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
         'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
        ].forEach(function(element, index, array) {
            process.on(element, function() { self.terminator(element); });
        });
    };


    /*  ================================================================  */
    /*  App server functions (main app logic here).                       */
    /*  ================================================================  */

    /**
     *  Create the routing table entries + handlers for the application.
     */
    self.createRoutes = function() {
        self.routes = { };

        self.routes['/'] = function(req, res) {
            res.setHeader('Content-Type', 'text/html');
            res.send(self.cache_get('index.html') );
        };

        self.routes['/index'] = function(req, res) {
            res.setHeader('Content-Type', 'text/html');
            res.send(self.cache_get('index.html') );
        };

        self.routes['/style.css'] = function (req, res) {
            res.setHeader('Content-Type', 'text/css');
            res.send(self.cache_get('style.css') );
        };

        self.routes['/mecha-webfont.woff'] = function (req, res) {
            res.setHeader('Content-Type', 'application/x-font-woff');
            res.send(self.cache_get('mecha-webfont.woff') );
        };

        self.routes['/mecha-webfont.ttf'] = function (req, res) {
            res.setHeader('Content-Type', 'application/x-font-ttf');
            res.send(self.cache_get('mecha-webfont.ttf') );
        };

        self.routes['/mecha-webfont.ttf'] = function (req, res) {
            res.setHeader('Content-Type', 'application/x-font-ttf');
            res.send(self.cache_get('mecha-webfont.ttf') );
        };

        self.routes['/mecha-webfont.svg'] = function (req, res) {
            res.setHeader('Content-Type', 'image/svg+xml');
            res.send(self.cache_get('mecha-webfont.svg') );
        };

        self.routes['/js/global.js'] = function (req, res) {
            res.setHeader('Content-Type', 'application/javascript');
            res.send(self.cache_get('js/global.js') );
        };

        self.routes['/js/ntc.js'] = function (req, res) {
            res.setHeader('Content-Type', 'application/javascript');
            res.send(self.cache_get('js/ntc.js') );
        };

        self.routes['/js/jquery.min.js'] = function (req, res) {
            res.setHeader('Content-Type', 'application/javascript');
            res.send(self.cache_get('js/jquery.min.js') );
        };

        self.routes['/js/keyDecode.js'] = function (req, res) {
            res.setHeader('Content-Type', 'application/javascript');
            res.send(self.cache_get('js/keyDecode.js') );
        };

        self.routes['/js/game.js'] = function (req, res) {
            res.setHeader('Content-Type', 'application/javascript');
            res.send(self.cache_get('js/game.js') );
        };

        self.routes['/js/body.js'] = function (req, res) {
            res.setHeader('Content-Type', 'application/javascript');
            res.send(self.cache_get('js/body.js') );
        };

        self.routes['/js/kitchen.js'] = function (req, res) {
            res.setHeader('Content-Type', 'application/javascript');
            res.send(self.cache_get('js/kitchen.js') );
        };

        self.routes['/js/snake.js'] = function (req, res) {
            res.setHeader('Content-Type', 'application/javascript');
            res.send(self.cache_get('js/snake.js') );
        };

        self.routes['/js/level.js'] = function (req, res) {
            res.setHeader('Content-Type', 'application/javascript');
            res.send(self.cache_get('js/level.js') );
        };


    };

    /**
     *  Initialize the server (express) and create the routes and register
     *  the handlers.
     */
    self.initializeServer = function() {
        self.createRoutes();
        self.app = express();
        // Enable gzip.
        self.app.use(express.compress());
        self.server = http.createServer(self.app);
        /*
        self.io = io.listen(self.server);
        self.io.set('transports', ['websocket','xhr-polling']);*/
        //  Add handlers for the app (from the routes).
        for (var r in self.routes) {
            self.app.get(r, self.routes[r]);
        }
    };


    /**
     *  Initializes the sample application.
     */
    self.initialize = function() {
        self.setupVariables();
        self.populateCache();
        self.setupTerminationHandlers();

        // Create the express server and routes.
        self.initializeServer();
    };

    /**
     *  Start the server (starts up the sample application).
     */
    self.start = function() {
        //  Start the app on the specific interface (and port).
        self.server.listen(self.port, self.ipaddress, function() {
            console.log('%s: Node server started on %s:%d ...',
                        Date(Date.now() ), self.ipaddress, self.port);
        });
    };

};

/**
 *  main():  Main code.
 */
var app = new frontEnd();
app.initialize();
app.start();