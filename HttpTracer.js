var http = require('http'),
    util = require('util'),
    url = require('url');

function Tracer(destinationHost, destinationPort, condition, logstream) {
    this._destinationHost = destinationHost;
    this._destinationPort = destinationPort || 80;
    this._condition = condition || function() {return true;};
    this._logstream = logstream || process.stdout;
}

Tracer.prototype._handleRequest = function(request, response) {
    var me = this,
        preamble = '',
        bodyChunks = [],
        responseChunks = [];

    var headers = request.headers;
    headers.host = me._destinationHost;
    headers['accept-encoding'] = 'identitity';

    preamble += (
        util.format('INCOMING REQUEST FOR %s\n', request.url) +
        '\n' +
        util.format('METHOD: %s\n', request.method) +
        'REQUEST HEADERS:\n'
    );

    Object.keys(headers).forEach(function(header) {
        preamble += util.format('   %s : %s\n', header.toUpperCase(), headers[header]);
    });

    proxyRequest = http.request({
        hostname: headers.host,
        port: me._destinationPort,
        method: request.method,
        headers: headers,
        path: request.url
    });

    function onError(err) {
        console.log('error: ' + err.message);
        if (!response.headersSent) response.writeHead(500, 'proxy error: ' + (err.message || ''));
        response.end();

        me._logRequest(pramble, bodyChunks, responseChunks, 'REQUEST FAILED: ' + (err.message  || ''));
    }

    function onResponse(proxyResponse) {
        preamble += '\nRESPONSE HEADERS\n';
        Object.keys(proxyResponse.headers).forEach(function(header) {
            preamble += util.format('   %s : %s\n', header.toUpperCase(),
                proxyResponse.headers[header]
            );
        });

        response.writeHead(
            proxyResponse.statusCode,
            proxyResponse.statusMessage || '',
            proxyResponse.headers
        );

        proxyResponse.on('error', onError);

        function readFromProxyResponse() {
            var chunk = proxyResponse.read();
            if (chunk) {
                responseChunks.push(chunk);
                response.write(chunk);
            }
        }

        proxyResponse.on('readable', readFromProxyResponse);

        proxyResponse.on('end', function() {
            readFromProxyResponse();
            response.end();
            me._logRequest(preamble, bodyChunks, responseChunks);
        });
    }

    function readFromRequest() {
        var chunk = request.read();
        if (chunk) {
            bodyChunks.push(chunk);
            proxyRequest.write(chunk);
        }
    }

    proxyRequest.on('error', onError);

    proxyRequest.on('response', onResponse);

    request.on('readable', readFromRequest);
    
    request.on('end', function() {
        readFromRequest();
        proxyRequest.end();
    });
};

Tracer.prototype._logRequest = function(preamble, bodyChunks, responseChunks, lastwords) {
    var logstream = this._logstream;

    logstream.write('\n\n=========================================\n\n');
    logstream.write(preamble.replace(/\n$/, ''));

    logstream.write('\n\nREQUEST BODY\n>>>\n');
    bodyChunks.forEach(function(chunk) {
        logstream.write(chunk);
    });

    logstream.write('<<<\n\nRESPONSE\n>>>\n');
    responseChunks.forEach(function(chunk) {
        logstream.write(chunk);
    });

    logstream.write('<<<\n');
    if (lastwords) logstream.write('\n' + lastwords.replace(/\n$/, ''));
};

Tracer.prototype.handle = function(request, response) {
    if (this._condition(request)) {
        this._handleRequest(request, response);
        return true;
    }

    return false;
};

HttpTracer = function() {
    var me = this;

    this._handlers = [];

    var server = http.createServer(function(request, response) {
        for (var i = 0; i < me._handlers.length; i++) {
            if (me._handlers[i].handle(request, response)) return;
        }

        response.writeHead(500, 'proxy error');
        response.write('Unhandled Request');
        response.end();
    });

    this.listen = server.listen.bind(server);
};

HttpTracer.prototype.trace = function (destinationHost, destinationPort, condition, logstream) {
    this._handlers.push(new Tracer(destinationHost, destinationPort, condition, logstream));
};

module.exports = HttpTracer;
