const fs = require('fs');

// List all files including hidden ones
fs.readdir('.', { withFileTypes: true }, (err, files) => {
    if (err) {
        console.log('Error:', err);
        return;
    }
    console.log('Files in directory:');
    files.forEach(file => {
        console.log(file.name);
    });
});

// Try to read .env file
try {
    const env = fs.readFileSync('.env', 'utf8');
    console.log('\n.env file contents:');
    console.log(env);
} catch (err) {
    console.log('\nError reading .env:');
    console.log(err);
}