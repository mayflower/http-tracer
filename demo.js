var HttpTracer = require('./HttpTracer.js');

var tracer = new HttpTracer();

tracer.trace('www.mayflower.de');

tracer.listen(8888);
