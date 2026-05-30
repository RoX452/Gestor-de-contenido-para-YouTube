async function run() {
  const req = await fetch('http://localhost:3000/api/v2/radar', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ channelUrl: "https://www.youtube.com/@nanobanana" })
  });
  const data = await req.json();
  console.log("Total length:", data.videos?.length);
  if(data.videos && data.videos.length > 50) {
     console.log(data.videos[50]);
     console.log(data.videos[data.videos.length - 1]);
  }
}
run();
