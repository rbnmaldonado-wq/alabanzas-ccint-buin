const https = require('https');
const fs = require('fs');

const url = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAzYjJkZGRjNDk3MzQxYjViNTE5YWYxZDk1NTlmODU5EgsSBxDOoe_fix8YAZIBIwoKcHJvamVjdF9pZBIVQhM0ODU3OTY1MzQ1Nzk2MzI4NzI0&filename=&opi=96797242";
const file = fs.createWriteStream("stitch_v2.html");

https.get(url, function (response) {
    response.pipe(file);
    file.on('finish', function () {
        file.close();
        console.log("Download completed.");
    });
}).on('error', function (err) {
    fs.unlink("stitch_v2.html");
    console.error("Error downloading file:", err.message);
});
