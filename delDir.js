const fs = require('fs');

console.log('##### Deleting directories ##############');
deleteDirSync('./');

function deleteDirSync(dir) {
    let files;
    try {
        files = fs.readdirSync(dir);
    } catch (err) {
        console.log(err.message);
        return;
    }
    for (let i = 0; i < files.length; i++) {
        let stat = fs.statSync(dir + files[i]);
        if (stat.isFile() && dir != './') {
            fs.unlinkSync(dir + files[i]);
        } else if (stat.isDirectory()) {
            if ((dir != './') || /^clone|build|dist/.test(files[i])) {
                if (dir == './') {
                    console.log(`\n\t##### Deleting ${files[i]} ####################`);
                }
                deleteDirSync(dir + files[i] + '/');
            }
        }
    }  

    if (dir != './') {
        fs.rmdirSync(dir);
    }
}