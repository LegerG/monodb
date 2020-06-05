"use strict";

const fs = require('fs').promises;
const fsCb = require('fs');

class MonoDB {
    #__colDir = undefined;
    #__filePath = undefined;
    #__name = undefined;
    #__keyName = undefined;
    #__index = undefined;
    #__mutex = undefined;

    static __dbPath = "./.database";

    constructor() {
        if (!this) {
            throw new Error("Call constructor with new");
        }

        this._id = this._id || this.getId();
        this._creationDate = this._creationDate || new Date();
        this._lastUpdateDate = new Date();

        this.setMeta();
    }

    async save(call) {
        return new Promise(async (resolve, reject) => {
            // this.lock(call);
            try {
                await fs.stat(this.#__colDir)
            } catch (err) {
                await fs.mkdir(this.#__colDir, {
                    recursive: true
                });
            }

            this._lastUpdateDate = new Date();
            let obj = this;
            let str = JSON.stringify(obj);

            fsCb.writeFile(this.#__filePath, str, "utf8", function (err, res) {
                if (err) {
                    console.log(err);
                    reject(new Error("ReadError: " + this.code + " do not exist"));
                    return;
                }
                resolve();
            });
            await this.saveIndex();
            // this.unlock(call);
        });
    }

    async delete() {
        try {
            await fs.unlink(this.#__filePath);
        } catch (err) {
            throw new Error("Document must be saved before to be deleted: " + this.code);
        }
        await this.deleteIndex();
    }

    async deleteIndex() {
        for (let indexName of this.#__index || []) {
            let indexPath = `${this.#__colDir}/${indexName}/${this[indexName]}/${this.id}.json`;
            try {
                await fs.unlink(indexPath);
            } catch (err) {
                throw new Error("Index must be exist to be deleted: " + this.code);
            }
        }
    }

    /**
     * Satic function to retrieve object already store
     * @param  {string}  id the id of object
     * @return {Promise}    object retrieve with correct prototype
     */
    static async get(id) {
        let colDir = `${MonoDB.dbPath}/${this.name}`;
        let filePath = `${colDir}/${id}.json`;
        let res = {};

        try {
            let content = await fs.readFile(filePath, 'utf8');
            res = JSON.parse(content);
        } catch (err) {
            return null;
        }

        res = Object.assign(new this, res);
        res.setMeta();

        return res;
    }

    /**** Index ****/

    setIndex(index) {
        if (!Array.isArray(index)) {
            index = [index];
        }
        // Check if all index exist and are defined
        for (let i of index) {
            if (!(i in this)) {
                throw new Error("All index name must be fields");
            }
        }

        this.#__index = index;
    }

    async saveIndex() {
        if (this.#__index) {
            for (let index of this.#__index) {
                let indexDir = `${this.#__colDir}/${index}/${this[index]}`;
                try {
                    await fs.stat(indexDir);
                } catch (err) {
                    fs.mkdir(indexDir, {
                        recursive: true
                    }).catch(function (err) {
                    });
                }

                let indexFile = `${indexDir}/${this.id}.json`;
                try {
                    await fs.symlink(this.#__filePath, indexFile);
                } catch (err) {
                    // console.log("DDDD"+err);
                }
            }
        }
    }

    static async getByIndex(indexName, value) {
        let colDir = `${MonoDB.dbPath}/${this.name}`;
        let indexDir = `${colDir}/${indexName}/${value}`;
        let res = [];
        let files = [];

        try {
            files = await fs.readdir(indexDir);
        } catch (err) {
            return res;
        }

        for (let file of files) {
            let filePath = `${colDir}/${file}`;
            try {
                let obj = JSON.parse(await fs.readFile(filePath, 'utf8'));
                obj = Object.assign(new this, obj);
                res.push(obj);
            } catch (err) {}
        }

        return res;
    }

    setMeta() {
        /*** Meta properties ***/
        this.#__name = this.constructor.name;
        this.#__colDir = `${MonoDB.dbPath}/${this.#__name}`;
        this.#__filePath = `${this.#__colDir}/${this._id}.json`;
    }

    get __meta() {
        return {
            colDir: this.#__colDir,
            filePath: this.#__filePath,
            name: this.#__name,
            keyName: this.#__keyName,
            index: this.#__index,
            mutex: this.#__mutex,
            dbPath: this.constructor.__dbPath
        };
    }

    static get dbPath() {
        return this.__dbPath || "./.database";
    }

    static set dbPath(path) {
        this.__dbPath = path;
    }

    static getMutex(key) {
        if (this.#__mutex) {
            return this.#__mutex[key] || false;
        } else {
            return false;
        }
    }

    static addMutex(key) {
        if (!this.#__mutex) {
            this.#__mutex = {};
        }
        this.#__mutex[key] = true;
    }

    static rmMutex(key) {
        this.#__mutex[key] = false;
    }

    get id() {
        return this._id;
    }

    set creationDate(nope) {
        throw new Error("You can not modify `id` field, use `_id` to not throw an error");
    }

    get creationDate() {
        return this._creationDate;
    }

    set creationDate(nope) {
        throw new Error("You can not modify `creationDate` field, use `_creationDate` to not throw an error");
    }

    get lastUpdateDate() {
        return this._lastUpdateDate;
    }

    set id(id) {
        throw new Error("Do not change id value");
    }

    static async deleteDB() {
        throw new Error("Unavailable function");
    }

    get code() {
        return this.#__name + "@" + this._id;
    }

    set code(nope) {
        throw new Error("Modification du code en cours");
    }

    equals(other) {
        return this.#__name === other.#__name && this.id === other.id;
    }

    getId() {
        return `${Math.random().toString(16).substring(3,7)}-${Math.random().toString(16).substring(3,7)}-${Math.random().toString(16).substring(3,7)}-${Math.random().toString(16).substring(3,7)}`
    }

    setKeyName(keyName) {
        if (keyName in this) {
            this.#__keyName = keyName;
            this._id = this[this.#__keyName];
            this.#__filePath = `${this.#__colDir}/${this._id}.json`;
        } else {
            throw new Error("Key name must be an existing field");
        }
    }

    getFilePath() {
        return this.#__filePath;
    }
}

module.exports = MonoDB;
