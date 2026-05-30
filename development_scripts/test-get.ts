import http from 'http';

const req = http.request({
  hostname: '0.0.0.0',
  port: 3000,
  path: '/api/version',
  method: 'GET'
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log('BODY:', data.substring(0, 200));
  });
});

req.on('error', e => console.error('ERROR:', e.message));
req.end();
