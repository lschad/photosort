(function () {
    'use strict'

    let gm = require('gm');

    let util = module.exports = {

        stringToObject: function (str) {
            str = str || '';
            let obj = {};

            let lines = str.match(/[^\r\n]+/g);
            if (!!lines) {

                for (let i = 0; i < lines.length; i++) {
                    let splitted = lines[i].split('=');
                    if (!!splitted[0] && !!splitted[1]) {
                        let val = splitted[1].toLowerCase() == 'unknown' ? null : splitted[1];
                        obj[splitted[0]] = val;
                    }
                }
            }

            return obj;
        },

        // https://stackoverflow.com/a/7712335
        stringToDateTime: function (str) {
            str = str || '';
            let pattern = /(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/;
            let dateArray = pattern.exec(str);
            if (!dateArray || dateArray.length < 6) return null;

            let dateObject = new Date(
                (+dateArray[1]),
                (+dateArray[2]) - 1, // Careful, month starts at 0!
                (+dateArray[3]),
                (+dateArray[4]),
                (+dateArray[5]),
                (+dateArray[6])
            );

            return dateObject;
        },

        getImageObject: function (file) {
            let format = 'SourcePath=' + file + '\n' +
                'Extension=%m\n' +
                'ImageUniqueId=%[EXIF:ImageUniqueId]\n' +
                'DateTime=%[EXIF:DateTime]';

            return new Promise(function (resolve, reject) {
                gm(file).identify(format, function (err, res) {
                    let exif = util.stringToObject(res);

                    if (err || !exif) {
                        console.info(`Failed to parse ${file}`);
                        reject(err);
                    } else {
                        resolve(exif);
                    }
                });
            });
        },

        uuidv4: function (delimiter) {
            if (typeof delimiter === 'undefined') delimiter = '-';
            // return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            let format = 'xxxxxxxx' + delimiter + 'xxxx' + delimiter + '4xxx' + delimiter + 'yxxx' + delimiter + 'xxxxxxxxxxxx';
            return format.replace(/[xy]/g, function (c) {
                let r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        },

        simplePromise: function (obj) {
            return new Promise(function (resolve, reject) {
                resolve(obj);
            });
        },

        targetPathFromImageObj: function (base, obj) {
            let year = obj.DateTime.getFullYear().toString();
            let month = (obj.DateTime.getMonth() + 1).toString();
            let day = obj.DateTime.getDate().toString();
            let hour = (obj.DateTime.getHours() + 1).toString();
            let minute = obj.DateTime.getMinutes().toString();
            let second = obj.DateTime.getSeconds().toString();
            let ms = obj.DateTime.getMilliseconds().toString();

            if (month < 10) month = `0${month}`;
            if (day < 10) day = `0${day}`;
            if (hour < 10) hour = `0${hour}`;
            if (minute < 10) minute = `0${minute}`;
            if (second < 10) second = `0${second}`;
            if (ms < 10) ms = `00${ms}`;
            else if (ms < 100) ms = `0${ms}`;

            let basePath = `${base}\\${year}\\${month}\\${day}`;
            let dateStamp = `${year}${month}${day}`;
            let timeStamp = `${hour}${minute}${second}${ms}Z`;
            let fullStamp = `${dateStamp}T${timeStamp}.${obj.Extension.toLowerCase()}`;
            let fileName = `IMG_${fullStamp}`;
            return { basePath: basePath, fileName: fileName, fullPath: function () { return `${basePath}\\${fileName}`; } };
        },

        processArray: function (array, fn) {
            let index = 0;

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
        },

    };
})();