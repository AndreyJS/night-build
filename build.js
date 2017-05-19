const gulp = require('gulp');
const htmlmin = require('gulp-htmlmin');
const child_process = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const zlib = require('zlib');
const options = require('./options');

let hashManifest = {},
    excludeOptions = {},
    excludeZip = { jpeg: 0, jpg: 0, ico: 0, png: 0 },
    cloneDir = 'clone/',
    rootDir = cloneDir + options.root + '/'; 

//Step 1: Clone project
// child_process.execSync('git clone git@git.connectflexi.com:Frontend/night2stay.git ' + cloneDir);
// child_process.execFileSync('git', ['clone', 'git@git.connectflexi.com:Frontend/night2stay.git', cloneDir]);
// child_process.execSync('npm install @angular/cli@latest', { cwd: 'clone'});
// child_process.execSync('ng build -prod');
// child_process.execFileSync('npm', ['install', '@angular/cli@latest'], { cwd: 'clone' });
// child_process.execFileSync('clone/npm', ['install']);

//Step 2: Minify
// minify();

//Step 3: Hashing
// hash();

//Step 4: Build
// child_process.execSync('cd .\clone\ ng build -prod');

//Step 5: Archiving
zip(cloneDir + 'dist');

function minify() {
    let srcArr = [];

    for (let i = 0, exc = options.minify.exclude; i < exc.length; i++) {
        excludeOptions[rootDir + exc[i]] = 0;
    }
    for (let i = 0, src = options.minify.src; i < src.length; i++) {
        minifyJSON(rootDir + (src[i] ? src[i] + '/' : src[i]));
        //[TODO] разобраться со слешем в rootDir
        srcArr.push(rootDir + (src[i] ? src[i] + '/' : src[i]) + '**/*.html');
        srcArr.push(rootDir + (src[i] ? src[i] + '/' : src[i]) + '**/*.svg');
    }
    excludeOptions = {};
    return gulp.src(srcArr, { base: './' })
        .pipe(htmlmin({
            caseSensitive: true,
            collapseInlineTagWhitespace: true,
            collapseWhitespace: true,
            minifyCSS: true,
            minifyJS: true,
            removeComments: true
        }))
        .pipe(gulp.dest('./'));           
}

function minifyJSON(dir) {
    let files = fs.readdirSync(dir);
    for (let i = 0; i < files.length; i++) {
        let stat = fs.statSync(dir + files[i]);

        if (stat.isFile()) {
            if ((dir + files[i]) in excludeOptions) {
                excludeOptions[dir + '/' + files[i]]++;
                continue;
            }
            if (files[i].indexOf('.json') === -1) continue;            
            let content = fs.readFileSync(dir + files[i], 'utf8');
            content = JSON.stringify(JSON.parse(content));
            fs.writeFileSync(dir + files[i], content);
        } else if (stat.isDirectory()) {
            minifyJSON(dir + files[i] + '/');
        }
    }    
}

function hash() { 
    //[TODO] favicon.ico, robots.txt, safary-pinned-tad? in exclude
    let src = options.hash.src;

    for (let i = 0, exc = options.hash.exclude; i < exc.length; i++) {
        excludeOptions[rootDir + exc[i]] = 0;
    }
    for (let i = 0; i < src.length; i++) {
        hashingFiles(rootDir + src[i]);
    }  
    fs.writeFileSync(cloneDir + 'hashManifest.json', JSON.stringify(hashManifest, null, 4));
    replaceHashingFiles(rootDir);
    //[TODO] browserconfig.xml, index.html, manifestWebmanifest, vendor in exclude
    excludeOptions = {};
};

function hashingFiles(dir) {
    let files = fs.readdirSync(dir);
    for (let j = 0; j < files.length; j++) {
        if ((dir + '/' + files[j]) in excludeOptions) {
            excludeOptions[dir + '/' + files[j]]++;
            continue;
        }
        let stat = fs.statSync(dir + '/' + files[j]);
        if (stat.isFile()) {
            let iLastDot = files[j].lastIndexOf('.');
            let filename = files[j].slice(0, iLastDot);
            let ext = files[j].slice(iLastDot);
            hashManifest[files[j]] = filename + '.' + crypto
                .createHash('sha256')
                .update(files[j])
                .digest('hex')
                .substr(0, 20) + ext;
            fs.renameSync(dir + '/' + files[j], dir + '/' + hashManifest[files[j]]);
        } else if (stat.isDirectory()) {
            hashingFiles(dir + '/' + files[j]);
        }
    }      
}

function replaceHashingFiles(dir) {
    let files = fs.readdirSync(dir);
    for (let i = 0; i < files.length; i++) {
        let stat = fs.statSync(dir + '/' + files[i]);
        if (stat.isFile()) {
            let content = fs.readFileSync(dir + '/' + files[i], 'utf8');
            let result;
            let hashKeyArr = Object.keys(hashManifest);
            for (let j = 0; j < hashKeyArr.length; j++) {
                let regexp = new RegExp(hashKeyArr[j], "g");
                result = content.replace(regexp, hashManifest[hashKeyArr[j]]);
            }
            if (content !== result) fs.writeFileSync(dir + '/' + files[i], result, 'utf8');
        } else if (stat.isDirectory()) {
            replaceHashingFiles(dir + '/' + files[i]);
        }
    }
}

function zip(dir) {
    let files = fs.readdirSync(dir);
    for (let i = 0; i < files.length; i++) {
        let stat = fs.statSync(dir + '/' + files[i]);

        if (stat.isFile()) {
            let ext,
                iExt = files[i].lastIndexOf('.');
            if (iExt !== -1) ext = files[i].substring(iExt + 1);
            if (ext in excludeZip) continue;

            let input = fs.readFileSync(dir + '/' + files[i], 'utf8');
            let zipBuff = zlib.gzipSync(input, { level: zlib.Z_BEST_COMPRESSION });  
            fs.writeFileSync(dir + '/' + files[i] + '.gz', zipBuff);
            fs.utimesSync(dir + '/' + files[i] + '.gz', stat.atime, stat.mtime);
        } else if (stat.isDirectory()) {
            zip(dir + '/' + files[i]);
        }
    }
}
