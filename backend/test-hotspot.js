const { MongoClient } = require('mongodb');
const uri = "mongodb://service_at_home:service123456@ac-j34uorr-shard-00-00.0wxhafr.mongodb.net:27017,ac-j34uorr-shard-00-01.0wxhafr.mongodb.net:27017,ac-j34uorr-shard-00-02.0wxhafr.mongodb.net:27017/service-at-your-home?ssl=true&replicaSet=atlas-j34uorr-shard-0&authSource=admin&retryWrites=true&w=majority";

const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
    tls: true
});

async function run() {
    try {
        await client.connect();
        console.log("✅ RAW DRIVER CONNECTED SUCCESSFULLY USING REPLICA BYPASS!");
    } catch (err) {
        console.error("❌ RAW DRIVER FAILED:");
        console.error(err);
    } finally {
        await client.close();
    }
}
run();
