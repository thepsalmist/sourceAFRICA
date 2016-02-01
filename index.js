var request = require('request'),
    fs = require('fs');

var url = 'https://openexchangerates.org/api/latest.json'

request({
    url: url,
    qs: {'app_id': '31beaa8ba1c14720bd5a8734b937069f'}
  }, function (error, response, body) {

    if (!error && response.statusCode === 200) {
      fs.writeFileSync('public/javascripts/rates.json', body);
    }
})
