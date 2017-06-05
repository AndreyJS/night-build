const child_process = require('child_process');
const fs = require('fs');

let packageJSON, projName, newVersion, projVersion;

for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === '-name' || process.argv[i] === '-n') {
        projName = process.argv[i + 1];
    }

    if (process.argv[i] === '-version' || process.argv[i] === '-v') {
        let isNextKey = process.argv[i + 1].indexOf('-');
        if (isNextKey !== -1) newVersion = '';
        else {
            newVersion = process.argv[i + 1];
            let template = /[0-9]{1,}\.[0-9]{1,}\.[0-9]{1,}$/;
            if (!template.test(newVersion)) {
                console.log("ERROR: new version doesn't match the template");
                console.log("TEMPLATE: [number].[number].[numder]");
                process.exit();
            }
        }
    }
}

if (!projName) {
    console.log("ERROR: project name is undefined");
    console.log("TEMPLATE: node version -name <projName> -version <newVersion>");
    process.exit();
}


let cloneDir = 'clone/';

// Step 0: Deleting directories if its exist
console.log('\n##### Deleting directories ##############\n');
deleteDirSync(cloneDir);

// fs.readdir(cloneDir, (err, files) => {
//     if (err) {
//         console.log(`ERROR: ${err}\n read dir: ${cloneDir}`);
//         return;
//     }
//     deleteDir(cloneDir, (files) => {
//         if (!files.length) {
//             fs.rmdir(dir, () => {});
//         }
//     });
// });

// Step 1: Cloning project
child_process.execSync('git clone git@git.connectflexi.com:Frontend/' + projName + '.git ' + cloneDir);

// Step 2: Reading package
readPackage();

// Step 3: Setting new version
console.log('\n##### Setting new version #############\n');
if (!newVersion) {
    incVersion();
} else {
    setVersion(newVersion);
}
console.log('new version: ' + packageJSON.version);

// Step 4: Pushing changes in repo
// pushChanges();

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
function deleteDir(dir, callback) {
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
                            callback(files);
                        });
                    });
                } else if (stat.isDirectory()) {
                    deleteDir(dir + files[i] + '/', (files) => {
                        if (!files.length) {
                            fs.rmdir(dir, () => {});
                        }
                    });
                }
            });           
        }  
    });
}

function readPackage() {
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
}

function setVersion(newVersion) {   
    packageJSON.version = newVersion;
    content = JSON.stringify(packageJSON, null, 4);
    fs.writeFileSync(cloneDir + 'package.json', content);
}


function incVersion() {
    let iLastDot = packageJSON.version.lastIndexOf('.');
    let patch = +packageJSON.version.slice(iLastDot + 1);
    packageJSON.version = packageJSON.version.slice(0, iLastDot + 1) + ++patch;
    content = JSON.stringify(packageJSON, null, 4);
    fs.writeFileSync(cloneDir + 'package.json', content);
}

function pushChanges() {
    child_process.execSync('git ch -b test', { cwd: cloneDir });
    child_process.execSync('git add .', { cwd: cloneDir });
    child_process.execSync('git co -m "inc v. package"', { cwd: cloneDir });
    child_process.execSync('git push --set-upstream origin test', { cwd: cloneDir });
}

