/* jshint node: true */
'use strict';

var system = require('system')
  , page = require('webpage').create()
  , _ = require('lodash');

var args = [
  'in'
, 'out'
, 'cssPath'
, 'paperFormat'
, 'paperOrientation'
, 'paperBorder'
, 'renderDelay'
, 'headerTemplate'
, 'headerHeight'
, 'footerTemplate'
, 'footerHeight'
].reduce(function(args, name, i) {
  args[name] = system.args[i+1];
  return args;
}, {});

page.open(args.in, function(status) {
  if (status == "fail") {
    page.close();
    phantom.exit(1);
    return;
  }

  page.evaluate(function(cssPath) {
    var css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = cssPath;
    document.querySelector('head').appendChild(css);
  }, args.cssPath);

  page.paperSize = {
    format: args.paperFormat
  , orientation: args.paperOrientation
  , border: args.paperBorder
  , header: {
      height: args.headerHeight,
      contents: phantom.callback(function(pageNum, numPages) {
        return _.template(args.headerTemplate)({ pageNum: pageNum, numPages: numPages });
      })
    }
  , footer: {
      height: args.footerHeight,
      contents: phantom.callback(function(pageNum, numPages) {
        return _.template(args.footerTemplate)({ pageNum: pageNum, numPages: numPages });
      })
    }
  };

  setTimeout(function () {
    page.render(args.out);
    page.close();
    phantom.exit(0);
  }, parseInt(args.renderDelay, 10));
});
