import {
  writeFilePromise,
  readFilePromise,
  appendFilePromise,
  removePromise,
  createFilePromise,
  readFileSync
} from '../../src/lib/file';
import path from 'path';
import TimedFile from '../../src/lib/index';
import {
  log
} from 'mocha-logger';
const PATH_DELIMITER = '/'; //path.delimiter;
const testFolder = [__dirname, '..', 'testcases'].join(PATH_DELIMITER)
const gitTestFolder = [testFolder, 'git'].join(PATH_DELIMITER);
const contentTestFolder = [testFolder, 'content'].join(PATH_DELIMITER);
const fileFullPath = [contentTestFolder, 'saveTest.js'].join(PATH_DELIMITER);
const author = {
  name: 'Raymond Ho',
  email: 'chunkiat82@gmail.com'
};

describe('TimedFile', function () {

  before(async() => {
    await createFilePromise(fileFullPath);
  });

  describe('Functionalities Present', function () {
    it('Functionalities Present', function (done) {
      const timedFile = new TimedFile({
        fileFullPath: `${__dirname}/LICENSE`,
        versionsPath: `${gitTestFolder}`
      });
      expect(timedFile).to.have.property('save');
      expect(timedFile).to.have.property('diff');
      expect(timedFile).to.have.property('fastforward');
      expect(timedFile).to.have.property('rollback');
      done();
    });
  });

  describe('Save', function () {
    it('Able to Save', async function () {
      const timedFile = new TimedFile({
        fileFullPath,
        versionsPath: `${gitTestFolder}`
      });
      await writeFilePromise(fileFullPath, 'Line 1\n');

      await timedFile.save(author);

      const jsDiffs = await timedFile.diff();
      expect(jsDiffs).to.eql([{
        value: 'Line 1\n',
        count: 4
      }]);
    });

    it('Able to Save with Existing History', async function () {
      await appendFilePromise(fileFullPath, 'Line 2\n');
      const timedFile = new TimedFile({
        fileFullPath,
        versionsPath: `${gitTestFolder}`
      });

      await timedFile.save(author);

      const jsDiffs = await timedFile.diff();
      expect(jsDiffs).to.eql([{
        count: 8,
        value: 'Line 1\nLine 2\n'
      }]);

    });
  });

  describe('Diff', function () {
    it('Able to Diff After Initialization', async function () {
      const timedFile = new TimedFile({
        fileFullPath,
        versionsPath: `${gitTestFolder}`
      });
      await appendFilePromise(fileFullPath, 'Line 3\n');

      const jsDiffs = await timedFile.diff();

      expect(jsDiffs).to.eql([{
        "count": 8,
        "value": "Line 1\nLine 2\n"
      }, {
        "count": 4,
        "added": true,
        "removed": undefined,
        "value": "Line 3\n"
      }]);
      await timedFile.reset();
    });

    it('Able to Diff Before Initialization', async function () {
      await appendFilePromise(fileFullPath, 'Line 3\n');
      const timedFile = new TimedFile({
        fileFullPath,
        versionsPath: `${gitTestFolder}`
      });

      const jsDiffs = await timedFile.diff();
      expect(jsDiffs).to.eql([{
        "count": 8,
        "value": "Line 1\nLine 2\n"
      }, {
        "count": 4,
        "added": true,
        "removed": undefined,
        "value": "Line 3\n"
      }]);
      await timedFile.reset();
    });
  });



  describe('Rollback', function () {
    it('Able to Rollback', async function () {
      const timedFile = new TimedFile({
        fileFullPath,
        versionsPath: `${gitTestFolder}`
      });
      const beforeRollback = await readFilePromise(fileFullPath);
      expect(beforeRollback.toString()).to.equal('Line 1\nLine 2\n');
      const jsDiffs = await timedFile.diff();

      await timedFile.rollback();

      const afterRollback = await readFilePromise(fileFullPath);
      expect(afterRollback.toString()).to.equal('Line 1\n');
      expect(timedFile.rolls.length).to.equal(1);
      await timedFile.reset();
    });
  });

  describe('FastForward', async function () {
    await removePromise(testFolder);
    it('Nothing to Fast Forward', async function () {
      const timedFile = new TimedFile({
        fileFullPath,
        versionsPath: `${gitTestFolder}`
      });
      const beforeFastForward = await readFilePromise(fileFullPath);
      expect(beforeFastForward.toString()).to.equal('Line 1\n');
      expect(timedFile.rolls.length).to.equal(0);

      await timedFile.fastforward();

      const afterFastForward = await readFilePromise(fileFullPath);
      expect(afterFastForward.toString()).to.equal('Line 1\n');
      expect(timedFile.rolls.length).to.equal(0);
    });

    it('Able to FastForward', async function () {
      const timedFile = new TimedFile({
        fileFullPath,
        versionsPath: `${gitTestFolder}`
      });
      const beforeRollback = await readFilePromise(fileFullPath);
      expect(beforeRollback.toString()).to.equal('Line 1\n');
      await timedFile.rollback();
      const afterRollback = await readFilePromise(fileFullPath);
      expect(afterRollback.toString()).to.equal('Line 1\n');
      expect(timedFile.rolls.length).to.equal(1);

      await timedFile.fastforward();

      const afterFastForward = await readFilePromise(fileFullPath);
      expect(afterFastForward.toString()).to.equal('Line 1\nLine 2\n');
      expect(timedFile.rolls.length).to.equal(0);
    });
  });

  describe('Reset', async function () {
    await removePromise(testFolder);
    it('Able to Reset', async function () {
      const timedFile = new TimedFile({
        fileFullPath,
        versionsPath: `${gitTestFolder}`
      });
      await appendFilePromise(fileFullPath, 'Line 3\n');
      const beforeReset = await readFilePromise(fileFullPath);
      expect(beforeReset.toString()).to.equal('Line 1\nLine 2\nLine 3\n');
      expect(timedFile.rolls.length).to.equal(0);

      await timedFile.reset();

      const afterReset = await readFilePromise(fileFullPath);
      expect(afterReset.toString()).to.equal('Line 1\nLine 2\n');
      expect(timedFile.rolls.length).to.equal(0);
    });

    it('Able to Reset correctly without rolling back', async function () {
      const timedFile = new TimedFile({
        fileFullPath,
        versionsPath: `${gitTestFolder}`
      });
      const beforeReset = await readFilePromise(fileFullPath);
      expect(beforeReset.toString()).to.equal('Line 1\nLine 2\n');
      expect(timedFile.rolls.length).to.equal(0);

      await appendFilePromise(fileFullPath, 'Line 3\n');
      await timedFile.save(author);
      await timedFile.rollback();
      await timedFile.reset();

      const afterReset = await readFilePromise(fileFullPath);
      expect(afterReset.toString()).to.equal('Line 1\nLine 2\n');
      expect(timedFile.rolls.length).to.equal(1);
    });
  });

  after('Tear Down', async() => {
    await removePromise(testFolder);
  });

});
