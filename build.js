const archiver = require('archiver');
const gulp = require('gulp');
const htmlmin = require('gulp-htmlmin');
const child_process = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const zlib = require('zlib');
const options = require('./options');

let hashManifest = {},
    excludeOptions = {},
    excludeExt = { jpeg: 0, jpg: 0, ico: 0, png: 0 },
    cloneDir = 'clone/',
    rootDir = cloneDir + options.root + '/'; 

// Step 1: Clone project
// child_process.execSync('git clone git@git.connectflexi.com:Frontend/night2stay.git ' + cloneDir);
child_process.execSync('npm install @angular/cli@1.0.3', { cwd: cloneDir });
// child_process.execSync('npm install', { cwd: cloneDir });

// Step 2: Minify
// minify();
// console.log('\n\t##### Minifyed ########################\n');

// // // Step 3: Hashing
// hash();
// console.log('\n\t##### Hashed ##########################\n');

// Step 4: Build
// child_process.execSync('ng build -prod -e backuat', { cwd: cloneDir });

// Step 5: Archiving
// console.log('\n\t##### Archiving files #################\n');
// for (let i = 0, exc = options.zip.exclude; i < exc.length; i++) {
//     excludeOptions[exc[i]] = 0;
// }
// hashManifest = JSON.parse(fs.readFileSync(cloneDir + 'hashManifest.json'));
// zip(cloneDir + 'dist/');
// excludeOptions = {};

// console.log('\n\t##### Archiving dist ##################\n');
// zipDist();
// console.log('\n\t##### Archived dist ###################\n');

function minify() {
    console.log('\n\t##### Minifying #######################\n');
    let srcArr = [];

    for (let i = 0, exc = options.minify.exclude; i < exc.length; i++) {
        excludeOptions[rootDir + exc[i]] = 0;
    }
    for (let i = 0, src = options.minify.src; i < src.length; i++) {
        minifyJSON(rootDir + (src[i] ? src[i] + '/' : src[i]));
        //[TODO] разобраться со слешем в rootDir
        srcArr.push(rootDir + (src[i] ? src[i] + '/' : src[i]) + '**/*.html');
        srcArr.push(rootDir + (src[i] ? src[i] + '/' : src[i]) + '**/*.svg');
        srcArr.push(rootDir + (src[i] ? src[i] + '/' : src[i]) + '**/*.xml'); // [TODO] пробел после первого тега xml
    }
    excludeOptions = {};
    return gulp.src(srcArr, { base: './' })
        .pipe(htmlmin({
            caseSensitive: true,
            collapseInlineTagWhitespace: true,
            collapseWhitespace: true,
            minifyCSS: true,
            minifyJS: true,
            removeComments: true,
            trimCustomFragments: true
        }))
        .pipe(gulp.dest('./'));        
}

function minifyJSON(dir) {
    let files = fs.readdirSync(dir);
    for (let i = 0; i < files.length; i++) {
        let stat = fs.statSync(dir + files[i]);
        // [TODO] минифицировать webManifest
        if (stat.isFile()) {
            if ((dir + files[i]) in excludeOptions) {
                excludeOptions[dir + '/' + files[i]]++;
                continue;
            }
            if (files[i].indexOf('.json') === -1 && files[i].indexOf('manifest.webmanifest') === -1) continue;            
            let content = fs.readFileSync(dir + files[i], 'utf8');
            content = JSON.stringify(JSON.parse(content));
            fs.writeFileSync(dir + files[i], content);
        } else if (stat.isDirectory()) {
            minifyJSON(dir + files[i] + '/');
        }
    }    
}

function hash() { 
    console.log('\n\t##### Hashing #########################')
    //[TODO] favicon.ico, robots.txt, safary-pinned-tad? in exclude
    let src = options.hash.src;

    for (let i = 0, exc = options.hash.exclude; i < exc.length; i++) {
        excludeOptions[rootDir + exc[i]] = 0;
    }
    console.log('\n\t##### Changing name files #############\n');
    for (let i = 0; i < src.length; i++) {
        hashingFiles(rootDir + src[i]);
    }  
    console.log('\n\t##### Writing hash manifest ###########\n');
    fs.writeFileSync(cloneDir + 'hashManifest.json', JSON.stringify(hashManifest, null, 4));
    console.log('Write:', cloneDir + 'hashManifest.json');
    console.log('\n\t##### Replacing hash url in files #####\n');
    replaceHashingFiles(rootDir);
    //[TODO] in browserconfig.xml, index.html, manifestWebmanifest, vendor not replaced
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
            console.log('rename file: ' + dir + '/' + files[j]);
            console.log('renamed to: ' + dir + '/' + hashManifest[files[j]]);
            console.log('----------'); 
            fs.renameSync(dir + '/' + files[j], dir + '/' + hashManifest[files[j]]);
        } else if (stat.isDirectory()) {
            hashingFiles(dir + '/' + files[j]);
        }
    }      
}

function replaceHashingFiles(dir) {
    let files = fs.readdirSync(dir);
    for (let i = 0; i < files.length; i++) {
        let stat = fs.statSync(dir + files[i]);
        if (stat.isFile()) {
            let ext,
                iExt = files[i].lastIndexOf('.');
            if (iExt !== -1) ext = files[i].substring(iExt + 1);
            if (ext in excludeExt) continue;

            let content = fs.readFileSync(dir + files[i], 'utf8');
            let result;
            let hashKeyArr = Object.keys(hashManifest);
            for (let j = 0; j < hashKeyArr.length; j++) {
                let regexp = new RegExp(hashKeyArr[j], "g");
                content = content.replace(regexp, (match) => {
                    console.log('file: ' + dir + files[i]);
                    console.log('matched string: ' + match);
                    console.log('replaced string: ' + hashManifest[hashKeyArr[j]]);
                    console.log('----------');                   
                    return hashManifest[hashKeyArr[j]];
                });
                // content = content.replace(regexp, hashManifest[hashKeyArr[j]]);
            }
            fs.writeFileSync(dir + files[i], content, 'utf8');
        } else if (stat.isDirectory()) {
            replaceHashingFiles(dir + files[i] + '/');
        }
    }
}

function zip(dir) {
    let files = fs.readdirSync(dir);
    for (let i = 0; i < files.length; i++) {
        if ((dir + files[i]) in excludeOptions) {
            excludeOptions[dir + files[i]]++;
            continue;
        }
        let stat = fs.statSync(dir + files[i]);

        if (stat.isFile()) {
            let ext, iExt = files[i].lastIndexOf('.');
            if (iExt !== -1) ext = files[i].substring(iExt + 1);

            let isExcludeFile = false;
            let excludeOptionsKeys = Object.keys(excludeOptions);
            for (let j = 0; j < excludeOptionsKeys.length; j++) {
                if (hashManifest[excludeOptionsKeys[j]] === files[i] || excludeOptionsKeys[j] === files[i]) {
                    isExcludeFile = true;
                    break;
                }
            }
            if (ext in excludeExt || isExcludeFile) continue;

            let input = fs.readFileSync(dir + files[i], 'utf8');
            let zipBuff = zlib.gzipSync(input, { level: zlib.Z_BEST_COMPRESSION });  
            fs.writeFileSync(dir + files[i] + '.gz', zipBuff);
            fs.utimesSync(dir + files[i] + '.gz', stat.atime, stat.mtime);
        } else if (stat.isDirectory()) {
            zip(dir + files[i] + '/');
        }
    }
}

function zipDist() {
    let packageJSON = JSON.parse(fs.readFileSync(cloneDir + 'package.json'));
    let nameZip = packageJSON.name ? packageJSON.name : '';
    nameZip = packageJSON.version && nameZip ? nameZip + '_' + packageJSON.version : packageJSON.version || nameZip;
    let output = fs.createWriteStream(cloneDir + (nameZip || 'dist') + '.zip');

    output.on('close', () => {
        console.log('Archive\'s size: ' + archive.pointer() + ' bytes');
        console.log('archiver has been finalized and the output file descriptor has closed');
    })

    let archive = archiver('zip');
    archive.on('error', (err) => {
        throw err;
    });
    archive.directory(cloneDir + 'dist', '');
    archive.finalize();
    archive.pipe(output);
}