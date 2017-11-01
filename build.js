const archiver = require('archiver');
const gulp = require('gulp');
const htmlmin = require('gulp-htmlmin');
const child_process = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
let http = require('http');
const zlib = require('zlib');
const options = require('./options');

let packageJSON, projName, projVersion, isUpload = false;

for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === '-name' || process.argv[i] === '-n') {
        projName = process.argv[i + 1];
    }
    if (process.argv[i] === '-upload' || process.argv[i] === '-up') {
        isUpload = true;
    }
}

if (!projName) {
    console.log("ERROR: project name is undefined");
    console.log("TEMPLATE: node build -name <projName>");
    process.exit();
}

let hashManifest = {},
    bannerManifest = [],
    excludeOptions = {},
    excludeExt = { jpeg: 0, jpg: 0, ico: 0, png: 0 },

    buildDir = 'build/',
    cloneDir = 'clone/',
    distDir = cloneDir + 'dist/';
    rootDir = cloneDir + options.root + '/';

// Step 0: Delete directories if its exist
// console.log('\n##### Deleting directories ##############\n');
// deleteDirSync(buildDir);
// deleteDirSync(cloneDir);
// Step 1: Clone project
// child_process.execSync('git clone git@git.connectflexi.com:Frontend/' + projName + '.git ' + ' -b build ' + cloneDir);

try {
    packageJSON = JSON.parse(fs.readFileSync(cloneDir + 'package.json'));
    console.log('\n##### Reading package.json ############\n');
    if (packageJSON.name) {
        projName = packageJSON.name;
        console.log("Project name: " + projName);
    }
    else {
        console.log("ERROR: project name is undefined");
        process.exit();
    }

    if (packageJSON.version) {
    projVersion = packageJSON.version;
    console.log("Project version: " + projVersion);
    }
    else {
        console.log("ERROR: project version is undefined");
        process.exit();
    }                                               
} catch (err) {
    console.log('' + err);
    process.exit();
}

console.log('\n##### Deleting webpack #############\n');
delWebpack();

// console.log('\n##### Installing packages #############\n');
// child_process.execSync('npm install @angular/cli@1.4.3', { cwd: cloneDir });
// child_process.execSync('npm install', { cwd: cloneDir });
// setPath();

// Step 2: Minify, Hashing, Building, Moving, Archiving files, Archiving dist
// minify();

// archiveZIP('prod');  
// build('prod');
// move();

function deleteDirSync(dir) {
    let files;
    try {
        files = fs.readdirSync(dir);
    } catch (err) {
        return;
    }
    for (let i = 0; i < files.length; i++) {
        let stat = fs.statSync(dir + files[i]);
        if (stat.isFile()) {
            fs.unlinkSync(dir + files[i]);
        } else if (stat.isDirectory()) {
            deleteDirSync(dir + files[i] + '/');
        }
    }  
    fs.rmdirSync(dir); 
}

//not work yet
function deleteDir(dir) {
    fs.readdir(dir, (err, files) => {
        if (err) {
            console.log(`ERROR: ${err}\n read dir: ${dir}`);
            return;
        }

        for (let i = 0; i < files.length; i++) {
            let stat = fs.stat(dir + files[i], (err, stat) => {
                if (err) {
                    console.log(`ERROR stat: ${err}\n stat of file: ${dir + files[i]}`);
                    return;
                }

                if (stat.isFile()) {
                    fs.unlink(dir + files[i], () => {
                        fs.readdir(dir, (err, files) => {
                            if (err) {
                                console.log(`ERROR: ${err}\n read dir: ${dir}`);
                                return;
                            }
                            if (!files.length) {
                                fs.rmdir(dir, () => {});
                            }
                        });
                    });
                } else if (stat.isDirectory()) {
                    deleteDir(dir + files[i] + '/');
                }
            });           
        }  
    });
}

function delWebpack() {
    // packageJSON = JSON.parse(fs.readFileSync(cloneDir + 'package.json'));
    delete packageJSON.devDependencies.webpack;
    delete packageJSON.devDependencies['webpack-dev-server'];

    let content = JSON.stringify(packageJSON, null, 4);
    fs.writeFileSync(cloneDir + 'package.json', content);    
}

function setPath() {
    let content;
    try {
        content = fs.readFileSync(cloneDir + 'node_modules/@angular/cli/models/webpack-configs/common.js', 'utf8');
    } catch(err) {
        console.log(err);
    }
    let index = content.indexOf('buildOptions.deployUrl');
    content = content.substring(0, index) + "'/js/'" + content.substring(index + 'buildOptions.deployUrl'.length);
    fs.writeFileSync(cloneDir + 'node_modules/@angular/cli/models/webpack-configs/common.js', content, 'utf8');
}

function minify() {
    console.log('\n##### Minifying #######################');
    let srcArr = [];

    for (let i = 0, exc = options.minify.exclude; i < exc.length; i++) {
        excludeOptions[rootDir + exc[i]] = 0;
    }
    for (let i = 0, src = options.minify.src; i < src.length; i++) {
        minifyJSON(rootDir + (src[i] ? src[i] + '/' : src[i]));
        srcArr.push(rootDir + (src[i] ? src[i] + '/' : src[i]) + '**/*.html');
        srcArr.push(rootDir + (src[i] ? src[i] + '/' : src[i]) + '**/*.svg');
        srcArr.push(rootDir + (src[i] ? src[i] + '/' : src[i]) + '**/*.xml');
    }
    excludeOptions = {};
    gulp.src(srcArr, { base: './' })
        .pipe(htmlmin({
            caseSensitive: true,
            // collapseInlineTagWhitespace: true,
            collapseWhitespace: true,
            minifyCSS: true,
            minifyJS: true,
            removeComments: true,
            trimCustomFragments: true
        }))
        .pipe(gulp.dest('./'))
        .on('end', () => {
            hash();
        });        
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
    console.log('\n##### Hashing #########################')
    let src = options.hash.src;

    for (let i = 0, exc = options.hash.exclude; i < exc.length; i++) {
        excludeOptions[rootDir + exc[i]] = 0;
    }
    console.log('\n\t##### Changing name files #############\n');
    for (let i = 0; i < src.length; i++) {
        hashingFiles(rootDir + src[i]);
    }  
    console.log('\n\t##### Creating hash manifest ###########\n');
    fs.writeFileSync(cloneDir + 'hashManifest.json', JSON.stringify(hashManifest, null, 4));
    console.log(cloneDir + 'hashManifest.json');
    console.log('\n\t##### Replacing hash url in files #####\n');
    replaceHashingFiles(rootDir);
    excludeOptions = {};

    build('uat');
    move();
    // archiveZIP('uat');  
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
                    .update(fs.readFileSync(dir + '/' + files[j]))
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
            }
            fs.writeFileSync(dir + files[i], content, 'utf8');
        } else if (stat.isDirectory()) {
            replaceHashingFiles(dir + files[i] + '/');
        }
    }
}

function build(envBuild) {
    try {
        fs.readdirSync('build');
    } catch(err) {
        fs.mkdirSync(buildDir);
    }
    console.log('\n##### Building ########################\n');
    console.log(`ng build -prod -e ${envBuild}`);
    child_process.execSync(`ng build -prod -e ${envBuild}`, { cwd: cloneDir });

}

function move() {
    // try {
    //     fs.readdirSync(distDir + 'js/');
    // } catch(err) {
    //     fs.mkdirSync(distDir + 'js/');
    // }
    // try {
    //     fs.readdirSync(distDir + 'css/');
    // } catch(err) {
    //     fs.mkdirSync(distDir + 'css/');
    // }
    let files = fs.readdirSync(distDir);

    for (let i = 0; i < files.length; i++) {
        let stat = fs.statSync(distDir + files[i]);
        if (stat.isFile()) {
            // if (/^flags(.)*\.svg$/.test(files[i]) || 
            //     /^icons(.)*\.svg$/.test(files[i]) ||
            //     /^login(.)*\.svg$/.test(files[i]) ||
            //     /^partners(.)*\.png$/.test(files[i])
            // ) {
            //     console.log(distDir + files[i]);
            //     fs.unlink(distDir + files[i]);
            // }

            /*if (/.js$/.test(files[i])) {
                fs.renameSync(distDir + files[i], distDir + 'js/' + files[i]);
            } else if (/.css$/.test(files[i])) {
                fs.renameSync(distDir + files[i], distDir + 'css/' + files[i]);
            } else*/ if (/^b(.)*\.png$/.test(files[i])) {
                fs.renameSync(distDir + files[i], distDir + 'img/' + files[i]);
                bannerManifest.push(files[i]);
            }
        }
    }
    replacingBanners();

    let robots = fs.readFileSync('robots.txt');
    fs.writeFileSync(distDir + 'robots.txt', robots);

    // let content = fs.readFileSync(distDir + 'index.html', 'utf8');
    // let regexp = new RegExp(/<link href="\/js\/(.*)\.css"/);
    // content = content.replace(regexp, (match) => {
    //     let index = match.lastIndexOf('/');
    //     return '<link href="/css/' + match.slice(index + 1);
    // });
    // fs.writeFileSync(distDir + 'index.html', content, 'utf8');
}

function replacingBanners() {
    let files = fs.readdirSync(distDir);
    for (let i = 0; i < files.length; i++) {

        if (/^vendor(.)*\.js$/.test(files[i])) {
            let content = fs.readFileSync(distDir + files[i], 'utf8');
            for (let j = 0; j < bannerManifest.length; j++) {
                let regexp = new RegExp(bannerManifest[j], "g");
                content = content.replace(regexp, (match) => {
                    console.log('file: ' + distDir + files[i]);
                    console.log('matched string: ' + match);
                    console.log('replaced string: img/' + bannerManifest[j]);
                    console.log('----------');                   
                    return 'img/' + bannerManifest[j];
                });
            }
            fs.writeFileSync(distDir + files[i], content, 'utf8');
        }
    }    
}

function archiveZIP(envBuild) {
    console.log('\n##### Archiving files #################\n');
    for (let i = 0, exc = options.zip.exclude; i < exc.length; i++) {
        excludeOptions[exc[i]] = 0;
    }
    zip(cloneDir + 'dist/');
    excludeOptions = {};

    zipDist(envBuild);
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
            hashManifest = JSON.parse(fs.readFileSync(cloneDir + 'hashManifest.json'));
            for (let j = 0; j < excludeOptionsKeys.length; j++) {
                if (hashManifest[excludeOptionsKeys[j]] === files[i] || excludeOptionsKeys[j] === files[i]) {
                    isExcludeFile = true;
                    break;
                }
            }
            if (ext in excludeExt || isExcludeFile) continue;

            let input = fs.readFileSync(dir + files[i], 'utf8');
            let zipBuff = zlib.gzipSync(input, { level: zlib.Z_BEST_COMPRESSION });  
            console.log('file: ' + dir + files[i]);
            console.log('archived file: ' + dir + files[i] + '.gz');
            console.log('----------');        
            fs.writeFileSync(dir + files[i] + '.gz', zipBuff);
            fs.utimesSync(dir + files[i] + '.gz', stat.atime, stat.mtime);
        } else if (stat.isDirectory()) {
            zip(dir + files[i] + '/');
        }
    }
}

function zipDist(envBuild) {

    // console.log('\n\t##### Creating file version #############\n');
    // console.log(cloneDir + 'dist/version.txt');
    // fs.writeFileSync(cloneDir + 'dist/version.txt', projVersion);

    console.log('\n##### Archiving dist ##################\n');
    let name = `${projName}-${projVersion}-${envBuild}.tar.gz`;
    let output = fs.createWriteStream(buildDir + name);

    output.on('close', () => {
        // deleteDirSync(cloneDir + 'dist/');

        console.log(`Archive ${name} created`);
        console.log('Total size: ' + archive.pointer() + ' bytes');
        console.log('Archiver has been finalized and the output file descriptor has closed');

        // if (envBuild === 'uat') {    
        //     build('prod');
        //     move();
        //     archiveZIP('prod');
        // } else if (envBuild === 'prod') {
        //     deleteDirSync(cloneDir);
        // }
        // if (isUpload) putToRepo(name);
    })

    let archive = archiver('tar', { gzip: true });
    archive.on('error', (err) => {
        console.log(err);
    });
    archive.directory(cloneDir + 'dist/', '');
    archive.finalize();
    archive.pipe(output);
}

function putToRepo(name) {
    console.log('\n##### Uploading to repo ###############\n');
    let buildName = fs.readFileSync('build/' + name);

    let options = {
        hostname: 'nexus.i.connectflexi.com',
        path: '/repository/connectflexi-raw/' + name,
        method: 'PUT',
        auth: 'builder:n3cnbx3u'
    }

    let req = http.request(options, () => {
        console.log(`File \'build/${name}\' uploaded to ${options.hostname + options.path}`);        
    });

    req.on('error', (err) => {
        console.log(`problem with request: ${err.message}`);
    });
    
    req.write(buildName);
    req.end();
}