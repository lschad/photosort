'use strict'

let fs = require('fs');
let util = require('./utils');
var mkdirp = require('mkdirp');

let source = 'C:\\Users\\lsc\\Downloads\\takeout\\Google Photos';
let targetBase = 'E:\\SortedPhotos';


let getTarget = function (obj) {
  let exif = obj.exif;
  let file = obj.file;

  let dt = util.stringToDateTime(exif.DateTime);
  let target = targetBase + '\\unknown';
  if (!!dt) {
    let id = exif['ImageUniqueId'] || util.uuidv4();
    let fileName = id + '.ext';
    let filePath = targetBase + '\\' + dt.getFullYear() + '\\' + (dt.getMonth() + 1);

    target = filePath + '\\' + fileName;
  }

  obj.target = target;
  return util.simplePromise(obj);
};

let updateImageObject = function (obj) {
  return new Promise(function (resolve, reject) {

    if (!obj.ImageUniqueId) {
      obj.ImageUniqueId = util.uuidv4('');
    }
    obj.DateTime = util.stringToDateTime(obj.DateTime);
    if (!!obj.DateTime) {
      let t = util.targetPathFromImageObj(targetBase, obj);
      obj.Filename = t.fileName;
      obj.TargetBase = t.basePath;
      obj.TargetPath = t.fullPath();
    } else {
      obj.Filename = `${obj.ImageUniqueId}.${obj.Extension.toLowerCase()}`
      obj.TargetBase = `${targetBase}\\unknown`;
      obj.TargetPath = `${obj.TargetBase}\\${obj.Filename}`;
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
    var read = fs.createReadStream(obj.SourcePath);
    var write = fs.createWriteStream(obj.TargetPath)

    read.on('error', reject);
    write.on('error', reject);
    write.on('close', function () { resolve(obj); });

    read.pipe(write);
  });
};


let printt = function (txt) {
  return function (obj) {
    return new Promise(function (resolve, reject) {
      console.info(txt);
      resolve(obj);
    });
  };
};
let printErr = function (err) {
  return new Promise(function (resolve, reject) {
    console.error(`error: ${err}`);
    reject(err);
  });
};


let gindex = 0;
let processImage = function (file) {
  return new Promise(function (resolve, reject) {

    util.getImageObject(`${source}\\${file}`)
      .then(updateImageObject)
      .then(makeFolderIfNeccesary)
      .then(copyImage)
      .then(function (obj) {
        console.info(`[${gindex++}] Copied image  ${obj.Filename}  to  ${obj.TargetBase}`);
        return util.simplePromise(obj);
      })
      .then(resolve)
      .catch(function (err) {
        console.error("RIP:" + err)
        resolve();
      });
  });
};


function processArray(array, fn) {
  var index = 0;

  return new Promise(function (resolve, reject) {

    function next() {
      if (index < array.length) {
        fn(array[index++]).then(next, reject);
      } else {
        resolve();
      }
    }
    next();
  });
}

let files = fs.readdirSync(source);

processArray(files, processImage);