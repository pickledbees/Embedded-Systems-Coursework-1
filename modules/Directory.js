'use strict';

const fs = require('fs');
const path = require('path');
const util = require('util');

function _mkDirIfNotExist(location) {
    if (!fs.existsSync(location))
        fs.mkdirSync(location);
}

//directory must be created before instantiating Directory object
class Directory {
    constructor(location) {
        //_assertExists(location);
        _mkDirIfNotExist(location);
        this.location = location;
    }

    //returns number of items in directory
    get size() {
        return fs.readdirSync(this.location).length;
    }

    //returns true if there is nothing in the directory, false otherwise
    get isEmpty() {
        return (this.size === 0);
    }

    //returns the names of items inside directory, absolute set to true to obtain full paths
    async readdir(absolute = false) {
        const dir = this;
        const items = await util.promisify(fs.readdir)(dir.location);
        if (absolute)
            return items.map(file => path.join(dir.location, file));
        return items;
    }

    //writes a new file into the directory
    async writeFile(fileName, data, options) {
        return util.promisify(fs.writeFile)(path.join(this.location, fileName), data, options);
    }

    //deletes a file in the directory
    async unlink(fileName) {
        return util.promisify(fs.unlink)(path.join(this.location, fileName));
    }

    async exists(fileName) {
        return fs.existsSync(path.join(this.location, fileName));
    }

    //deletes all items in the directory
    async empty(number) {
        const files = await this.readdir(true);
        if (number === undefined) {
            for (let file of files)
                fs.unlinkSync(file);
        } else {
            for (let file of files.slice(number))
                fs.unlinkSync(file);
        }
    }
}

module.exports = Directory;