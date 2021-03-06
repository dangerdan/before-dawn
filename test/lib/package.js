'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const rimraf = require("rimraf");
const sinon = require('sinon');


const Package = require('../../src/lib/package.js');

const helpers = require('./setup.js');

var attrs;

var workingDir;
var dataPath;
var zipPath;

var sandbox;

describe('Package', function() {
  beforeEach(() => {
    sandbox = sinon.createSandbox();

    workingDir = helpers.getTempDir();
    dataPath = path.join(__dirname, "..", "fixtures", "release.json");
    zipPath = path.join(__dirname, "..", "fixtures", "test-savers.zip");

    attrs = {
      repo: "muffinista/before-dawn-screensavers",
      dest:workingDir
    }
  });
  afterEach(function () {
    sandbox.restore();
  });

	describe('initialization', function() {
    it('loads data', function() {
      var p = new Package(attrs);

			assert.equal(false, p.downloaded);
			assert.equal(false, p.attrs().downloaded);      

      assert.equal(workingDir, p.dest);
      assert.equal(workingDir, p.attrs().dest);      
		});
  });

  describe('getReleaseInfo', () => {
    describe('withValidResponse', () => {
      var request = require("request-promise-native");
      beforeEach(() => {
        sinon.stub(request, 'get').resolves(require('../fixtures/release.json'));
      });
      afterEach(() => {
        request.get.restore();
      });
      
      it('does stuff', async () => {
        var p = new Package(attrs);
        let results = await p.getReleaseInfo();
        assert.equal("muffinista", results.author.login);
      });
    });

    describe('withReject', () => {
      var request = require("request-promise-native");
      beforeEach(() => {
        sinon.stub(request, 'get').rejects();
      });
      afterEach(() => {
        request.get.restore();
      });

      it('survives', async () => {
        var p = new Package(attrs);
        let results = await p.getReleaseInfo();
        assert.deepEqual({}, results);
      });
    });
  });

  describe('checkLatestRelease', () => {
    var p;

    beforeEach(() => {
      p = new Package(attrs);
      sandbox.stub(p, 'getReleaseInfo').
              returns(require('../fixtures/release.json'));
    });
     
    it('calls downloadFile', async () => {
      var df = sandbox.stub(p, 'downloadFile').resolves(zipPath);

      let results = await p.checkLatestRelease();
      assert(df.calledOnce);
    });

    it('doesnt call if not needed', async () => {
      var cb = sinon.spy();
      var df = sandbox.stub(p, 'downloadFile');

      p.updated_at = "2017-06-06T23:55:44Z";
      
      let results = await p.checkLatestRelease(cb);
      assert(!df.calledOnce);
    });
  });
   
  describe('checkLocalRelease', () => {
    var p;
    
    beforeEach(() => {
      p = new Package(attrs);
    });
    
    it('calls zipToSavers', async () => {
      var zts = sandbox.stub(p, 'zipToSavers').resolves({});
      
      let results = await p.checkLocalRelease(dataPath, zipPath);
      assert(zts.calledOnce);

      assert.equal(results.updated_at, '2017-06-06T23:55:44Z');
    });
    
    it('doesnt call if not needed', async () => {
      var zts = sandbox.stub(p, 'zipToSavers');
      
      p.updated_at = "2017-06-06T23:55:44Z";
      
      let results = await p.checkLocalRelease(dataPath, zipPath);
      assert(!zts.calledOnce);
    });
  });
   
  describe('zipToSavers', () => {
    var p;

    beforeEach(() => {
      p = new Package(attrs);
      rimraf.sync(workingDir);
      fs.mkdirSync(workingDir);
    });

    it('unzips files', (done) => {
      p.zipToSavers(zipPath).then((attrs) => {
        var testDest = path.resolve(workingDir, "sparks", "index.html");
        assert(fs.existsSync(testDest));
        done();
      });
    });

    it('recovers from errors', (done) => {
      p.zipToSavers(dataPath).then((attrs) => {}).catch( (err) => {
        done();
      });
    });

    it('keeps files on failure', (done) => {
      helpers.addSaver(workingDir, "saver-one", "saver.json");
      
      var testDest = path.resolve(workingDir, "saver-one", "saver.json");
      assert(fs.existsSync(testDest));
      
      p.zipToSavers(dataPath).catch( (err) => {
        assert(fs.existsSync(testDest));
        done();
      });
    });


    it('removes files that arent needed', (done) => {
      helpers.addSaver(workingDir, "saver-one", "saver.json");
      
      var testDest = path.resolve(workingDir, "saver-one", "saver.json");
      assert(fs.existsSync(testDest));


      p.zipToSavers(zipPath).then((attrs) => {
        assert(!fs.existsSync(testDest));
        done();
      });     
    });
  });
  
});
