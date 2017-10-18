'use strict';

const assert = require('assert');
const Saver = require('../../app/lib/savers.js');
const _ = require('lodash');
const tmp = require('tmp');
const rimraf = require('rimraf');
const fs = require('fs-extra');
const path = require('path');

describe('Savers', function() {
  var savers = require('../../app/lib/savers.js');
  var saverData;
  var configData;

  var getTempDir = function() {
    var tmpObj = tmp.dirSync();
    return tmpObj.name;
  };

  var workingDir;
  var saversDir;
  var saverJSONFile;
  
  beforeEach(function() {
    var testSaverDir;

    workingDir = getTempDir();
    saversDir = getTempDir();

    // make a subdir in the savers directory and drop screensaver
    // config there
    testSaverDir = path.join(saversDir, 'saver');
    fs.mkdirSync(testSaverDir);
    saverJSONFile = path.join(testSaverDir, 'saver.json');
    fs.copySync(path.join(__dirname, '../fixtures/saver.json'), saverJSONFile);

    testSaverDir = path.join(saversDir, 'saver2');
    fs.mkdirSync(testSaverDir);
    fs.copySync(path.join(__dirname, '../fixtures/saver2.json'), path.join(testSaverDir, 'saver.json'));

    saverData = require('../fixtures/saver.json');
  });

  afterEach(function() {
    if ( fs.existsSync(workingDir) ) {
      rimraf.sync(workingDir);
    }
  });
  
	describe('initialization', function() {
    it('sets firstLoad', function(done) {
      savers.init(workingDir, function() {
        assert(savers.firstLoad());
        done();
      });
    });

    /* it('does not set firstLoad', function(done) {
       savers.init(workingDir, function() {
       savers.init(workingDir, function() {
       assert(!savers.firstLoad());
       done();
       });
       });
       });
     */
  });

  describe('loadFromFile', function() {
    it('loads data', function(done) {
      savers.loadFromFile(saverJSONFile).then((s) => {
        assert.equal("Screensaver One", s.name);
        done();
      });
    });

    it('sets editable', function(done) {
      savers.loadFromFile(saverJSONFile, true).then((s) => {
        assert(s.editable);
        assert.equal(s.settings['New Option I Guess'], '75');
        done();
      });
    });
    
    it('applies options', function(done) {
      savers.loadFromFile(saverJSONFile, false, { 'New Option I Guess': '25' }).then((s) => {
        assert.equal(s.settings['New Option I Guess'], '25');
        done();
      });
    });
  });
  
  describe('listAll', function() {
    it('loads data', function(done) {
      savers.init(workingDir, function() {
        savers.setLocalSource(saversDir);
        savers.listAll(function(data) {
          assert.equal(3, data.length);
          done();
        });
      });
    });
  });

  describe('generateScreensaver', function() {
    it('works', function(done) {
      savers.init(workingDir, function() {
        savers.setLocalSource(saversDir);
        savers.generateScreensaver({
          name:"New Screensaver"
        });

        savers.listAll(function(data) {
          assert.equal(4, data.length);
          done();
        });
      });
    });
  });

  describe('getByKey', function() {
    it("returns saver", function(done) {
      savers.init(workingDir, function() {
        savers.setLocalSource(saversDir);
        savers.listAll(function(data) {
          var key = data[2].key;
          var s = savers.getByKey(key);
          assert.equal("Screensaver One", s.name);
          done();
        });
      });
    });
  });

  describe('setCurrent', function() {
    it("sets a key", function(done) {
      savers.init(workingDir, function() {
        savers.setLocalSource(saversDir);
        savers.listAll(function(data) {
          var key = data[2].key;
          savers.setCurrent(key);
          assert.equal(key, savers.getCurrent());
          savers.write(function() {
            savers.reload(function() {
              assert.equal(key, savers.getCurrent());
              done();
            });
          });
        });
      });
    });
  });

  // reset
  // load
  // default source
  // sources
  // write
});