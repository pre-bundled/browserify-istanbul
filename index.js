var through = require("./pre-bundled/node_modules/through");
var minimatch = require("./pre-bundled/node_modules/minimatch");
var objectAssign = require("./pre-bundled/node_modules/object-assign");

var defaultIgnore = ['**/node_modules/**', '**/bower_components/**', '**/test/**', '**/tests/**', '**/*.json'];

function shouldIgnoreFile(file, options) {
  var ignore = options.defaultIgnore === false ? [] : defaultIgnore;
  ignore = ignore.concat(options.ignore || []);

  return ignore.some(function(pattern) {
    return minimatch(file, pattern, options.minimatchOptions);
  });
}

module.exports = function(options, extraOptions) {
  var file;
  options = options || {};

  if (typeof options === 'string') {
    file = options;
    options = extraOptions || {};
    return transform(options, file);
  }

  return transform.bind(null, options);
};

function transform(options, file) {
  if (shouldIgnoreFile(file, options))
    return through();

  var instrumenterConfig = objectAssign({}, {
    autoWrap: true,
    coverageVariable: '__coverage__',
    embedSource: true,
    noCompact: false,
    preserveComments: true,
    produceSourceMap: true
  }, options.instrumenterConfig);

  var instrumenter = (options.instrumenter || require("./pre-bundled/node_modules/istanbul-lib-instrument")).createInstrumenter(instrumenterConfig);

  var data = '';
  return through(function(buf) {
    data += buf;
  }, function() {
    var self = this;
    instrumenter.instrument(data, file, function(err, code) {
      if (!err) {
        self.queue(code);
      } else {
        self.emit('error', err);
      }
      self.queue(null);
    });
  });
}
