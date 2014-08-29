# What is it?

This module provides a HTTP server proxies all incoming requests to a remote
server and simultaneously logs all communication to an output stream. The
intented purpose is debugging REST APIs.

# How to use it?

See `demo.js` for example usage. Each `HttpTrace` instance is a HTTP server that allows
you to register one or more tracing rules. Rules are checked in the order in
which they are registered, the rule that is registered first has highest
priority.

The `trace` method takes four arguments, of which only the first one is
mandatory:

* Destination host.
* Destination port (default 80)
* Condition function. This function decides whether a request is handled by this
  rule (is passed the request object and must return a bool). Default is to
  handle all requests.
* Logging stream. Default is stdout.

If you need more information: Use the source, luke.

# Limitations

The Tracer does not handle compressed responses (yet), so the ACCEPT-ENCODING
header sent to the actual server is changed to identity. If you want to log and
proxy the HTTP status message, you'll have to use node 11.

**IMPORTANT:** The request headers shown are those actually sent to the handling
server.
