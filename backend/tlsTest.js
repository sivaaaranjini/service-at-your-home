const tls = require('tls');

const options = {
    host: 'ac-j34uorr-shard-00-00.0wxhafr.mongodb.net',
    port: 27017,
    servername: 'ac-j34uorr-shard-00-00.0wxhafr.mongodb.net', // SNI
    rejectUnauthorized: false
};

console.log('Attempting TLS connection to Atlas node...');
const socket = tls.connect(options, () => {
    console.log('✅ TLS Connected successfully!');
    console.log('Cipher:', socket.getCipher());
    socket.destroy();
});

socket.on('error', (err) => {
    console.error('❌ TLS Connection Error:', err);
});

socket.setTimeout(5000, () => {
    console.error('❌ TLS Handshake Timed Out!');
    socket.destroy();
});
