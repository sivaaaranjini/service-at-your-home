const dns = require('dns');
const resolver = new dns.Resolver();
resolver.setServers(['8.8.8.8']);
resolver.resolveSrv('_mongodb._tcp.cluster0.0wxhafr.mongodb.net', (err, addresses) => {
    if (err) {
        console.error('DNS err:', err);
        return;
    }
    console.log(JSON.stringify(addresses, null, 2));
});
