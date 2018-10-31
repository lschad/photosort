(function () {
  'use strict'

  let path = require('path');
  let fs = require('fs');
  let util = require('./utils');
  let mkdirp = require('mkdirp');
  let args = require('args');
  let glob = require('glob');
  let chalk = require('chalk');

  let source = null;
  let targetBase = null;

  args
    .option('source', 'Path where images will be searched for.')
    .option('target', 'Path where images will be stored.')
    .option('recursive', 'Defines if images should be searched for recursively.', false)
    .example('./app --source /home/lsc/pictures --target /photos --recursive', 'Copy pictures recursively.');

  const flags = args.parse(process.argv)

  let updateImageObject = function (obj) {
    return new Promise(function (resolve, reject) {

      if (!obj.ImageUniqueId) {
        obj.ImageUniqueId = util.uuidv4('');
      }
      obj.Extension = obj.Extension.toLowerCase();
      obj.DateTime = util.stringToDateTime(obj.DateTime);
      if (!!obj.DateTime) {
        let t = util.targetPathFromImageObj(targetBase, obj);
        obj.Filename = t.fileName;
        obj.TargetBase = t.basePath;
        obj.TargetPath = t.fullPath();
      } else {
        obj.Filename = `${obj.ImageUniqueId}`
        obj.TargetBase = `${targetBase}\\unknown`;
        obj.TargetPath = path.join(targetBase, `${obj.Filename}.${obj.Extension}`);
      }

      resolve(obj);
    });
  };

  let makeFolderIfNeccesary = function (obj) {
    return new Promise(function (resolve, reject) {
      mkdirp(obj.TargetBase, function (err) {
        if (!err) resolve(obj); else reject(err);
      });
    });

  };

  let copyImage = function (obj) {
    return new Promise(function (resolve, reject) {

      // check if file exists
      if (fs.existsSync(obj.TargetPath)) {
        if (util.filesAreEqual(obj.SourcePath, obj.TargetPath)) {
          reject(`${chalk.white(obj.TargetPath)} already exists and equals the source. Skipped.`);
        } else {
          let index = 1;
          let fn = '';
          while (fs.existsSync(obj.TargetPath)) {
            obj.TargetPath = path.join(obj.TargetBase, `${obj.Filename}_${index++}.${obj.Extension}`);
          }
        }
      }

      // copy image
      var read = fs.createReadStream(obj.SourcePath);
      var write = fs.createWriteStream(obj.TargetPath)

      read.on('error', reject);
      write.on('error', reject);
      write.on('close', function () { resolve(obj); });

      read.pipe(write);

    });
  };

  let run = function () {

    if (!flags.source || !flags.target) {
      console.warn('You need to specify source and target paths.\n\nType -h/--help for more information.');
      process.exit(1);
    }
    source = flags.source;
    targetBase = flags.target;

    let files = [];
    if (flags.recursive == false) {
      files = glob.sync(`${source}/*`, { nodir: true });
    } else {
      files = glob.sync(`${source}/**/*`, { nodir: true });
    }

    let gindex = 0;
    util.processArray(files, function (file) {
      return new Promise(function (resolve, reject) {

        util.getImageObject(`${file}`)
          .then(updateImageObject)
          .then(makeFolderIfNeccesary)
          .then(copyImage)
          .then(function (obj) {
            console.info(chalk.gray(`[${gindex++}] Copied ${chalk.white(obj.SourcePath)} to ${chalk.white(obj.TargetPath)}`));
            return util.simplePromise(obj);
          })
          .then(resolve)
          .catch(function (err) {
            console.error(chalk.yellow(`Failed to copy image: ${err}`))
            resolve();
          });

      });
    });
  };

  run();
})();