const archiver = require('archiver');
const gulp = require('gulp');
const htmlmin = require('gulp-htmlmin');
const child_process = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const zlib = require('zlib');
const options = require('./options');

let packageJSON = [], 
    projName = [], 
    projVersion = [], 
    projBranch = 'master',
    projType,
    isUpload = false,
    hashManifest = [],
    enviroment = [],
    excludeOptions = [],
    excludeExt = { jpeg: 0, jpg: 0, ico: 0, png: 0 },
    buildDir = 'build/',
    configDir = 'subs/',
    cloneDir = [],
    distDir = [],
    rootDir = [];

    for (let i = 0; i < options.types.length; i++) {
        cloneDir[i] = 'clone' + (options.types[i] ? `_${options.types[i]}/` : '/');
        distDir[i] = {};
        rootDir[i] = cloneDir[i] + options.root + '/';
        hashManifest[i] = {};
        enviroment[i] = {};
        excludeOptions[i] = {};

        for (let j = 0; j < options.env.length; j++) {
            distDir[i][options.env[j]] = cloneDir[i] + 'dist_' + options.env[j] + '/';
            enviroment[i][options.env[j]] = 1;
        }
    }

// Analyzing command
for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === '-type' || process.argv[i] === '-t') {
        projType = process.argv[i + 1];
    }
    if (process.argv[i] === '-branch' || process.argv[i] === '-b') {
        projBranch = process.argv[i + 1];
    }     
}

// Deleting directories if its exist
// console.log('\n##### Deleting directories ##############\n');
// deleteDirSync(buildDir);
// deleteDirSync(cloneDir);

// Cloning project
for (let i = 0; i < options.types.length; i++) {
    child_process.execSync('git clone ' + '-b ' + projBranch + ' git@git.connectflexi.com:Frontend/night2stay.git ' + cloneDir[i]);
}

// Reading name and version of project
try {
    for (let i = 0; i < options.types.length; i++) {
        packageJSON[i] = JSON.parse(fs.readFileSync(cloneDir[i] + 'package.json'));
        console.log('\n##### Reading package.json ############\n');
        if (packageJSON[i].name) {
            projName[i] = packageJSON[i].name;
            console.log("Project name: " + projName[i]);
        }
        else {
            console.log("ERROR: project name is undefined");
            process.exit();
        }

        if (packageJSON[i].version) {
        projVersion[i] = packageJSON[i].version;
        console.log("Project version: " + projVersion[i]);
        }
        else {
            console.log("ERROR: project version is undefined");
            process.exit();
        }

        if (options.types[i] != 'night2stay') {
            let deps = packageJSON[i].dependencies;
            
            if (deps['n2s-translation']) {
                deps['n2s-translation'] = `${deps['n2s-translation']}#${options.types[i]}`;
            } else {
                console.log("ERROR: n2s-translation is undefined");
                process.exit();
            }

            if (deps['n2s-banner']) {
                deps['n2s-banner'] = `${deps['n2s-banner']}#${options.types[i]}`;
            } else {
                console.log("ERROR: n2s-banner is undefined");
                process.exit();
            }

            delete packageJSON[i].devDependencies.webpack;
            delete packageJSON[i].devDependencies['webpack-dev-server'];

            fs.writeFileSync(cloneDir[i] + 'package.json', JSON.stringify(packageJSON[i]));
        }

        // Type
        console.log("Project type: " + options.types[i]);
        // Branch
        console.log("Project branch: " + projBranch);
    }
} catch (err) {
    console.log('' + err);
    process.exit();
}

setUp();

function setUp() {
    for (let i = 0; i < options.types.length; i++) {
        if (options.types[i] != 'night2stay') {
            console.log('\n##### SetUp ' + options.types[i] + ' config #############');

            let fromPath,
                toPath;

            let paths = [
                {
                    path: "app/core/options/",
                    file: "options.ts"
                },
                {
                    path: "app/core/",
                    file: "loading.ts"
                },
                {
                    path: "",
                    file: "index.html"
                },
                {
                    path: "",
                    file: "assets/",
                    isDir: true
                }
            ];

            for (let j = 0, ln = paths.length; j < ln; j++) {
                let fromPath = rootDir[i] + configDir + options.types[i] + "/" + paths[j].file,
                    toPath = rootDir[i] + paths[j].path + paths[j].file;

                console.log(`\n\t##### Copy ${paths[j].file} #############`);
                console.log('\tfrom ' + fromPath + ' --> ' + toPath);

                if (paths[j].isDir) {
                    deleteDirSync(toPath);
                    fs.renameSync(fromPath, toPath);                
                } else {
                    fs.writeFileSync(toPath, fs.readFileSync(fromPath, "utf8"));
                }
            }

            console.log('\n##### SetUp ' + options.types[i] + ' config done #############\n');
            // process.exit();
        }

        console.log('\n##### Deleting SetUp ' + options.types[i] + ' folder #############\n');
        deleteDirSync(rootDir[i] + configDir);
    }
}

// console.log('\n##### Deleting webpack #############\n');
// delWebpack();

for (let i = 0; i < options.types.length; i++) {
    console.log('\n##### Installing packages in ' + cloneDir[i] + ' #############\n');
    // console.log((new Date()).getMinutes() + ':' + (new Date()).getSeconds());
    // child_process.exec('npm install', { cwd: cloneDir[i] }, (error, stdout, stderr) => {
    //     console.log('npm i done: ' + (new Date()).getMinutes() + ':' + (new Date()).getSeconds());
    //     minify(i);
    // });

    child_process.execSync('npm install', { cwd: cloneDir[i] });
    minify(i);
}
// setPathJS();

// Minify, Hashing, Building, Moving, Archiving files, Archiving dist
// minify();

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

function delWebpack(i) {
    delete packageJSON[i].devDependencies.webpack;
    delete packageJSON[i].devDependencies['webpack-dev-server'];

    let content = JSON.stringify(packageJSON[i], null, 4);
    fs.writeFileSync(cloneDir[i] + 'package.json', content);    
}

function setPathJS() {
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

function minify(i) {
    console.log('\n##### Minifying ' + rootDir[i] + ' #######################');
    let srcArr = [];

    for (let j = 0, exc = options.minify.exclude; j < exc.length; j++) {
        excludeOptions[i][rootDir[i] + exc[j]] = 0;
    }
    for (let j = 0, src = options.minify.src; j < src.length; j++) {
        minifyJSON(i, rootDir[i] + (src[j] ? src[j] + '/' : src[j]));
        srcArr.push(rootDir[i] + (src[j] ? src[j] + '/' : src[j]) + '**/*.html');
        srcArr.push(rootDir[i] + (src[j] ? src[j] + '/' : src[j]) + '**/*.svg');
        srcArr.push(rootDir[i] + (src[j] ? src[j] + '/' : src[j]) + '**/*.xml');
    }
    excludeOptions[i] = {};
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
            hash(i);
        });        
}

function minifyJSON(i, dir) {
    let files = fs.readdirSync(dir);
    for (let j = 0; j < files.length; j++) {
        let stat = fs.statSync(dir + files[j]);
        if (stat.isFile()) {
            if ((dir + files[j]) in excludeOptions[i]) {
                excludeOptions[i][dir + '/' + files[j]]++;
                continue;
            }
            if (files[j].indexOf('.json') === -1 && files[j].indexOf('manifest.webmanifest') === -1) continue;  
            let content = fs.readFileSync(dir + files[j], 'utf8');
            content = JSON.stringify(JSON.parse(content));
            fs.writeFileSync(dir + files[j], content);
        } else if (stat.isDirectory()) {
            minifyJSON(i, dir + files[j] + '/');
        }
    }    
}

function hash(i) { 
    console.log('\n##### Hashing #########################')
    let src = options.hash.src;

    for (let j = 0, exc = options.hash.exclude; j < exc.length; j++) {
        excludeOptions[i][rootDir[i] + exc[j]] = 0;
    }
    console.log('\n\t##### Changing name files #############\n');
    for (let j = 0; j < src.length; j++) {
        hashFiles(i, rootDir[i] + src[j]);
    }  
    console.log('\n\t##### Creating hash manifest ###########\n');
    fs.writeFileSync(cloneDir[i] + 'hashManifest.json', JSON.stringify(hashManifest[i], null, 4));
    console.log(cloneDir[i] + 'hashManifest.json');
    console.log('\n\t##### Replacing hash url in files #####\n');
    replaceHashFiles(i, rootDir[i]);
    excludeOptions[i] = {};

    preBuild(i);
};

function hashFiles(i, dir) {
    let files = fs.readdirSync(dir);
    for (let j = 0; j < files.length; j++) {
        if ((dir + '/' + files[j]) in excludeOptions[i]) {
            excludeOptions[i][dir + '/' + files[j]]++;
            continue;
        }
        let stat = fs.statSync(dir + '/' + files[j]);
        if (stat.isFile()) {
            let iLastDot = files[j].lastIndexOf('.');
            let filename = files[j].slice(0, iLastDot);
            let ext = files[j].slice(iLastDot);
            hashManifest[i][files[j]] = filename + '.' + crypto
                    .createHash('sha256')
                    .update(fs.readFileSync(dir + '/' + files[j]))
                    .digest('hex')
                    .substr(0, 20) + ext; 
            console.log('rename file: ' + dir + '/' + files[j]);
            console.log('renamed to: ' + dir + '/' + hashManifest[i][files[j]]);
            console.log('----------'); 
            fs.renameSync(dir + '/' + files[j], dir + '/' + hashManifest[i][files[j]]);
        } else if (stat.isDirectory()) {
            hashFiles(i, dir + '/' + files[j]);
        }
    }      
}

function replaceHashFiles(i, dir) {
    let files = fs.readdirSync(dir);
    for (let j = 0; j < files.length; j++) {
        let stat = fs.statSync(dir + files[j]);
        if (stat.isFile()) {
            let ext,
                iExt = files[j].lastIndexOf('.');
            if (iExt !== -1) ext = files[j].substring(iExt + 1);
            if (ext in excludeExt) continue;

            let content = fs.readFileSync(dir + files[j], 'utf8');
            let hashKeyArr = Object.keys(hashManifest[i]);
            for (let k = 0; k < hashKeyArr.length; k++) {
                let regexp = new RegExp(hashKeyArr[k], "g");
                content = content.replace(regexp, (match) => {
                    console.log('file: ' + dir + files[j]);
                    console.log('matched string: ' + match);
                    console.log('replaced string: ' + hashManifest[i][hashKeyArr[k]]);
                    console.log('----------');                   
                    return hashManifest[i][hashKeyArr[k]];
                });
            }
            fs.writeFileSync(dir + files[j], content, 'utf8');
        } else if (stat.isDirectory()) {
            replaceHashFiles(i, dir + files[j] + '/');
        }
    }
}

function preBuild(i) {
    // function build(envBuild) {
    console.log('\n##### Building ########################\n');

    try {
        fs.readdirSync('build');
    } catch(err) {
        fs.mkdirSync(buildDir);
    }

    let content = fs.readFileSync(cloneDir[i] + ".angular-cli.json", 'utf8');
    content = content.replace(/dist/, (match) => {                 
        return 'dist_back';
    });
    fs.writeFileSync(cloneDir[i] + ".angular-cli.json", content, 'utf8');

    build(i, 0);
}

function build(i, indexEnv) {
    console.log(`ng build -prod -e ${options.env[indexEnv]}`);
    enviroment[i][options.env[indexEnv]] = 0;
    let process = child_process.exec(`ng build -prod -e ${options.env[indexEnv]}`, { cwd: cloneDir[i] }, (error, stdout, stderr) => {
        console.log(`build ${options.types[i]} ${options.env[indexEnv]}: done`);
        move(i, options.env[indexEnv]);
        archiveZIP(i, options.env[indexEnv]); 
    }); //--build-optimizer false

    process.stdout.on('data', (data) => {
        if (enviroment[i][options.env[indexEnv + 1]]) {
            let cliJSON = fs.readFile(cloneDir[i] + ".angular-cli.json", 'utf8', (err, buf) => {
                let beforeDir = 'dist_' + options.env[indexEnv],
                    afterDir = 'dist_' + options.env[indexEnv + 1],
                    regexp = new RegExp(beforeDir, "g");
    
                buf = buf.replace(regexp, (match) => {
                    console.log('file: .angular-cli.json');
                    console.log('matched string: ' + match);
                    console.log('replaced string: ' + afterDir);
                    console.log('----------');                   
                    return afterDir;
                });
    
                fs.writeFile(cloneDir[i] + ".angular-cli.json", buf, (data) => {
                    build(i, indexEnv + 1);
                });
            });
        }
    });
}

function move(i, env) {
    let files = fs.readdirSync(distDir[i][env] + 'img/');
    
    for (let j = 0; j < files.length; j++) {
        let stat = fs.statSync(distDir[i][env] + 'img/' + files[j]);
        if (/^(flags|icons|login_bg|partners-logos)(.)*(\.svg|\.png)$/.test(files[j])) {
            fs.unlinkSync(distDir[i][env] + 'img/' + files[j]);
        }
    }

    // Copy robots.txt to dist
    let robots = fs.readFileSync('robots_' + env + '.txt');
    fs.writeFileSync(distDir[i][env] + 'robots.txt', robots);

    changeVersion(i, env);
}

function replaceImgs(manifest, source) {
    let files = fs.readdirSync(distDir);
    for (let i = 0; i < files.length; i++) {

        if (source.test(files[i])) {
            let content = fs.readFileSync(distDir + files[i], 'utf8');
            for (let j = 0; j < manifest.length; j++) {
                let regexp = new RegExp(manifest[j], "g");
                content = content.replace(regexp, (match) => {
                    console.log('file: ' + distDir + files[i]);
                    console.log('matched string: ' + match);
                    console.log('replaced string: img/' + manifest[j]);
                    console.log('----------');                   
                    return 'img/' + manifest[j];
                });
            }
            fs.writeFileSync(distDir + files[i], content, 'utf8');
        }
    }    
}

function changeVersion(i, env) {
    let dir = distDir[i][env];
    let content = fs.readFileSync(dir + 'index.html', 'utf8');
    let regexp = new RegExp('app-version="', "g");

    content = content.replace(regexp, (match) => {
        console.log('file: ' + dir + 'index.html');
        console.log('matched string: ' + match);
        console.log('replaced string: ' + match + projVersion[i]);
        console.log('----------');                   
        return match + projVersion[i];
    });

    fs.writeFileSync(dir + 'index.html', content, 'utf8');
}

function archiveZIP(i, env) {
    console.log('\n##### Archiving files #################\n');
    for (let j = 0, exc = options.zip.exclude; j < exc.length; j++) {
        excludeOptions[i][exc[j]] = 0;
    }
    zip(i, distDir[i][env]);
    excludeOptions[i] = {};

    zipDist(i, env);
}

function zip(i, dir) {
    let files = fs.readdirSync(dir);
    for (let j = 0; j < files.length; j++) {
        if ((dir + files[j]) in excludeOptions[i]) {
            excludeOptions[i][dir + files[j]]++;
            continue;
        }
        let stat = fs.statSync(dir + files[j]);

        if (stat.isFile()) {
            let ext, iExt = files[j].lastIndexOf('.');
            if (iExt !== -1) ext = files[j].substring(iExt + 1);

            let isExcludeFile = false;
            let excludeOptionsKeys = Object.keys(excludeOptions[i]);
            hashManifest[i] = JSON.parse(fs.readFileSync(cloneDir[i] + 'hashManifest.json'));
            for (let k = 0; k < excludeOptionsKeys.length; k++) {
                if (hashManifest[i][excludeOptionsKeys[k]] === files[j] || excludeOptionsKeys[k] === files[j]) {
                    isExcludeFile = true;
                    break;
                }
            }
            if (ext in excludeExt || isExcludeFile) continue;

            let input = fs.readFileSync(dir + files[j], 'utf8');
            let zipBuff = zlib.gzipSync(input, { level: zlib.Z_BEST_COMPRESSION });  
            console.log('file: ' + dir + files[j]);
            console.log('archived file: ' + dir + files[j] + '.gz');
            console.log('----------');        
            fs.writeFileSync(dir + files[j] + '.gz', zipBuff);
            fs.utimesSync(dir + files[j] + '.gz', stat.atime, stat.mtime);
        } else if (stat.isDirectory()) {
            zip(i, dir + files[j] + '/');
        }
    }
}

function zipDist(i, env) {

    // console.log('\n\t##### Creating file version #############\n');
    // console.log(cloneDir + 'dist/version.txt');
    // fs.writeFileSync(cloneDir + 'dist/version.txt', projVersion);

    console.log('\n##### Archiving dist ##################\n');
    let name = `${options.types[i]}-${projVersion[i]}-${env}.tar.gz`;
    let output = fs.createWriteStream(buildDir + name);

    output.on('close', () => {
        // deleteDirSync(cloneDir + 'dist/');

        console.log(`Archive ${name} created`);
        console.log('Total size: ' + archive.pointer() + ' bytes');
        console.log('Archiver has been finalized and the output file descriptor has closed');

        // if (envBuild === 'back') {
        //     build('uat');
        //     move('uat');
        //     archiveZIP('uat');
        // } else if (envBuild === 'uat') {
        //     build('prod');
        //     move('prod');
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
    archive.directory(distDir[i][env], '');
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