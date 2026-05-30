import { ApifyClient } from 'apify-client';

const client = new ApifyClient({ token: 'YOUR_APIFY_TOKEN' });

async function check() {
  try {
    const actor = await client.actor('starvibe/youtube-video-transcript').get();
    console.log(actor.name, actor.username);
    
    // I need to see the run history to see what inputs were used
    const list = await client.runs().list();
    const lastRunId = list.items[0].id;
    const run = await client.run(lastRunId).get();
    
    // Let's get the input from the dataset/key-value store of that run
    if (run.defaultKeyValueStoreId) {
       const kv = client.keyValueStore(run.defaultKeyValueStoreId);
       const input = await kv.getRecord('INPUT');
       console.log("INPUT RECORD:", JSON.stringify(input.value));
    }
  } catch(e) {
    console.error(e.message);
  }
}
check();
