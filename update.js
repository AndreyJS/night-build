const child_process = require('child_process');
const fs = require('fs');

let packageJSON, projName;

for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === '-name' || process.argv[i] === '-n') {
        projName = process.argv[i + 1];
    }
}

if (!projName) {
    console.log("ERROR: project name is undefined");
    console.log("TEMPLATE: node update -name <projName>");
    process.exit();
}

let cloneDir = 'clone/';

// Step 0: Deleting directories if its exist
console.log('\n##### Deleting directories ##############\n');
deleteDirSync(cloneDir);

// Step 1: Cloning project
child_process.execSync('git clone git@git.connectflexi.com:Frontend/' + projName + '.git ' + cloneDir);

console.log('\n##### Installing packages ###############\n');
child_process.execSync('npm install @angular/cli@1.0.3', { cwd: cloneDir });
child_process.execSync('npm install', { cwd: cloneDir });

// Step 2: Reading node_modules
console.log('\n##### Reading node_modules ##############');
try {
    fs.readdirSync(cloneDir + 'node_modules');
} catch(err) {
    console.log(`ERROR: directory \'${cloneDir}node_modules\' doesn't exist`);
    process.exit();
}

// Step 3: Reading package.json
console.log('\n##### Reading package.json ##############');
try {
    packageJSON = fs.readFileSync(cloneDir + 'package.json', 'utf8');
} catch(err) {
    console.log("ERROR: file \'package.json\' doesn't exist");
    process.exit();
}

// Step 4: Updating version

packageJSON = JSON.parse(packageJSON);

let depArr = Object.keys(packageJSON.dependencies);
let devArr = Object.keys(packageJSON.devDependencies);

console.log('\n##### Checking dependencies #############\n');
updatePackVersion('dependencies');

console.log('\n##### Checking devDependencies #############\n');
updatePackVersion('devDependencies');

fs.writeFileSync(cloneDir + 'package.json', JSON.stringify(packageJSON, null, 4));
console.log('\n##### Changes made #########################\n');

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

function updatePackVersion(type) {
    let arr;
    if (type === 'dependencies') arr = depArr;
    else if (type === 'devDependencies') arr = devArr;
    for (let i = 0; i < arr.length; i++) {
        let path = cloneDir + 'node_modules/' + arr[i];

        try {
            fs.readdirSync(path);
        } catch(err) {
            console.log(path + ' doesn\'t exist');
            continue;
        }
        
        let content 
        try {
            content = fs.readFileSync(path + '/package.json');
        } catch(err) {
            console.log(path + '/package.json doesn\'t exist');
            continue;
        }

        let verProjPackage = packageJSON[type][arr[i]].substring(1);
        let verNodePackage = JSON.parse(content).version;
        if (verProjPackage !== verNodePackage) {
            packageJSON[type][arr[i]] = '^' + verNodePackage;
            console.log(`Version ${arr[i]} ${verProjPackage} changed to ${verNodePackage}`)
        }
    }
}