/* jshint node: true */
'use strict';

var fs = require('fs')
  , path = require('path')
  , through = require('through')
  , jade = require('jade')
  , juice = require('juice')
  , tmp = require('tmp')
  , childProcess = require('child_process')
  , duplexer = require('duplexer');

tmp.setGracefulCleanup();

function jadepdf(options) {
  options = options || {};
  options.phantomPath = options.phantomPath || require('phantomjs').path;
  options.cssPath = options.cssPath || __dirname + '/../pdf.css';
  options.paperFormat = options.paperFormat || 'A4';
  options.paperOrientation = options.paperOrientation || 'portrait';
  options.paperBorder = options.paperBorder || '1cm';
  options.renderDelay = options.renderDelay || 500;
  options.locals = options.locals || {};
  options.header = options.header || {};
  options.header.height = options.header.height || 0;
  options.footer = options.footer || {};
  options.footer.height = options.footer.height || 0;

  var css = '';
  if (options.cssPath) {
    css = fs.readFileSync(options.cssPath).toString();
  }

  var jadeStr = '';
  var jadeToHtml = through(
    function write(data) {
      jadeStr += data;
    }
  , function end() {
      var fn = jade.compile(jadeStr);
      var html = fn(options.locals);
      html = juice.inlineContent(html, css);
      this.queue(html);
      this.queue(null);
    }
  );

  var inputStream = through()
    , outputStream = through();

  inputStream.pause(); // until we are ready to read

  // TODO: use streams
  var jadeHeader = '';
  if (options.header.path)
    jadeHeader = juice.inlineContent(jade.renderFile(options.header.path), css);
  var jadeFooter = '';
  if (options.footer.path)
    jadeFooter = juice.inlineContent(jade.renderFile(options.footer.path), css);

  tmp.file({postfix: '.html'}, function(err, tmpHtmlPath, tmpHtmlFd) {
    if (err) return outputStream.emit('error', err);
    fs.close(tmpHtmlFd);

    tmp.file({postfix: '.pdf'}, function(err, tmpPdfPath, tmpPdfFd) {
      if (err) return outputStream.emit('error', err);
      fs.close(tmpPdfFd);

      var htmlToTmpHtmlFile = fs.createWriteStream(tmpHtmlPath);
      htmlToTmpHtmlFile.on('finish', function() {
        var args = [
          path.join(__dirname, '..', 'lib-phantom', 'index.js')
        , tmpHtmlPath
        , tmpPdfPath
        , options.cssPath
        , options.paperFormat
        , options.paperOrientation
        , options.paperBorder
        , options.renderDelay
        , jadeHeader
        , options.header.height
        , jadeFooter
        , options.footer.height
        ];

        childProcess.execFile(options.phantomPath, args, function(err, stdout, stderr) {
          if (err) return outputStream.emit('error', err);
          fs.createReadStream(tmpPdfPath).pipe(outputStream);
        });
      });

      inputStream.pipe(jadeToHtml).pipe(htmlToTmpHtmlFile);
      inputStream.resume();
    });
  });

  return duplexer(inputStream, outputStream);
}

module.exports = jadepdf;
